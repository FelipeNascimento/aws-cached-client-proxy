const AWS = require("aws-sdk");
class AWSAuthenticatedProxy {
  constructor(AWSClient, region, accessKeyId, secretAccessKey, sessionToken) {
    var options = {
      region: region || "us-east-1"
    };
    if (accessKeyId) options.accessKeyId = accessKeyId
    if (secretAccessKey) options.secretAccessKey = secretAccessKey
    if (sessionToken) options.sessionToken = sessionToken
    this.client = new AWSClient(options)
    for (let prop in this.client) {
      if (typeof this.client[prop] === 'function') {
        this[prop] = function () {
          let params = arguments[0]
          return new Promise((fulfill, reject) => {
            this.client[prop](params, (err, data) => {
              if (err) reject(err)
              fulfill(data)
            })
          })
        }
      }
    }
  }
}
module.exports = AWSAuthenticatedProxy