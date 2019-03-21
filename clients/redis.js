require('type-extensions/string')
const IoRedis = require('ioredis')
class Redis {
  constructor(host, port) {
    this.host = host
    this.port = port
    this.formatKey = key => String.toMD5(key.toLowerCase())
  }
  get(key, formatKey) {
    return new Promise((fulfill, reject) => {
      let client = new IoRedis(this.port, this.host)
      client.get(formatKey ? formatKey(key) : this.formatKey(key), (err, data) => {
        client.disconnect()
        if (err) reject(err)
        else {
          fulfill(data)
        }
      })
    })
  }
  set(key, data, expires, formatKey) {
    return new Promise((fulfill, reject) => {
      let client = new IoRedis(this.port, this.host)
      client.set(formatKey ? formatKey(key) : this.formatKey(key), data, 'ex', expires || 60)
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
  delete(key, formatKey) {
    return new Promise((fulfill, reject) => {
      let client = new IoRedis(this.port, this.host)
      client.set(formatKey ? formatKey(key) : this.formatKey(key), null, 'ex', 1)
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
}
const instance = new Redis(process.env.REDIS_HOST, process.env.REDIS_PORT)
module.exports = instance