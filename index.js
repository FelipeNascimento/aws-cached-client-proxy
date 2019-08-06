require('type-extensions/string')
const AWS = require("aws-sdk");
const redis = require('./redis')
AWS.events.on('retry', function(resp) {
  if (resp.error && resp.error.code === 'Throttling') {
    resp.error.retryable = true;
  }
});
class AWSCachedProxy {
  constructor(AWSClient, region = "us-east-1", accessKeyId, secretAccessKey, sessionToken) {
    this.AWS = AWS
    this.options = {
      region: region
    };
    if (accessKeyId) this.options.accessKeyId = accessKeyId
    if (secretAccessKey) this.options.secretAccessKey = secretAccessKey
    if (sessionToken) this.options.sessionToken = sessionToken
    this.client = new AWSClient(this.options)
    for (let prop in this.client) {
      if (typeof this.client[prop] === 'function') {
        this[prop] = function (params, retry = 0) {
          return new Promise((fulfill, reject) => {
            this.client[prop](params, (err, data) => {
              if (err) {
                if(err.code === 'Throttling') {
                  //TODO: LOG KPI for throttling
                  if(retry < 4)
                  retry += 1
                  setTimeout(() => {
                    this[prop](params,retry)
                      .then(fulfill)
                      .catch(reject)
                  }, 500 * retry)
                }
                else reject(err)
              }
              else fulfill(data)
            })
          })
        }
        if (prop.startsWith('get') || prop.startsWith('describe') || prop.startsWith('read')) {
          this[`${prop}Cached`] = async function (params, ttl) {
            let key = `${prop}:${String.toMD5({ token: this.options.sessionToken, params: params })}`
            let cached = await redis.get(key);
            if (cached) return JSON.parse(cached)
            let response = await this[prop](params)
            if (response) redis.set(key, JSON.stringify(response), ttl || 90);
            return response
          }
        }
      }
    }
  }
}
module.exports = AWSCachedProxy