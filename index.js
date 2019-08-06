require('type-extensions/string')
const AWS = require("aws-sdk");
const IoRedis = require('ioredis')
const getCache = (key) => {
  return new Promise((fulfill, reject) => {
    let client = new IoRedis(process.env.REDIS_PORT, process.env.REDIS_HOST)
    client.get(key, (err, data) => {
      client.disconnect()
      if (err) reject(err)
      else {
        fulfill(data)
      }
    })
  })
}
const setCache = (key, data, expires) => {
  return new Promise((fulfill, reject) => {
    let client = new IoRedis(process.env.REDIS_PORT, process.env.REDIS_HOST)
    client.set(key, data, 'ex', expires || 60)
      .then(data => {
        client.disconnect()
        fulfill(data)
      })
      .catch(err => {
        client.disconnect()
        reject(err)
      })
  })
}
AWS.events.on('retry', function (resp) {
  if (resp.error && resp.error.code === 'Throttling') {
    resp.error.retryable = true;
  }
});
class AWSCachedProxy {
  constructor(AWSClient, region = "us-east-1", credentials = {}) {
    this.options = {
      region: region
    };
    if (credentials.accessKeyId) this.options.accessKeyId = credentials.accessKeyId
    if (credentials.secretAccessKey) this.options.secretAccessKey = credentials.secretAccessKey
    if (credentials.sessionToken) this.options.sessionToken = credentials.sessionToken
    this.client = new AWSClient(this.options)
    for (let prop in this.client) {
      if (typeof this.client[prop] === 'function') {
        this[prop] = function (params, retry = 0) {
          return new Promise((fulfill, reject) => {
            this.client[prop](params, (err, data) => {
              if (err) {
                if (err.code === 'Throttling') {
                  //TODO: LOG KPI for throttling
                  if (retry < 4)
                    retry += 1
                  setTimeout(() => {
                    this[prop](params, retry)
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
            let cached = await getCache(key);
            if (cached) return JSON.parse(cached)
            let response = await this[prop](params)
            if (response) setCache(key, JSON.stringify(response), ttl || 60);
            return response
          }
        }
      }
    }
  }
}
AWSCachedProxy.AWS = AWS
module.exports = AWSCachedProxy

