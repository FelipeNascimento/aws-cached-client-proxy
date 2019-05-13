const AWS = require("aws-sdk");
const redis = require('./clients/redis')
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if (accessKeyId) options.accessKeyId = accessKeyId
  if (secretAccessKey) options.secretAccessKey = secretAccessKey
  if (sessionToken) options.sessionToken = sessionToken
  return new AWS.S3(options);
}
function _getObject(key, bucket, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    try {
      let client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
      client.getObject({
        Bucket: bucket,
        Key: key
      },
        (err, data) => {
          if (err) {
            if (err.code === "NoSuchKey") fulfill(null);
            else reject(err);
          } else {
            fulfill(data.Body.toString());
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}
function _putObject(key, data, bucket, acl, tags = [], region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    try {
      const params = {
        Bucket: bucket,
        Key: key,
        Body: data,
        ACL: acl || 'private',
        Tagging: tags.map(tag => `${tag.key}=${tag.value}`).join('&')
      }
      let client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
      client.putObject(params, (err, data) => {
        if (err) reject(err)
        else {
          fulfill(data)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}
exports.listObjects = function (prefix, bucket, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    try {
      let client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
      client.listObjects({
        Bucket: bucket,
        Prefix: prefix.toLowerCase()
      },
        (err, data) => {
          if (err) reject(err);
          else {
            let tasks = [];
            data.Contents.forEach(item => {
              if (item.Key !== prefix) tasks.push(this.getObject(item.Key, bucket));
            });
            Promise.all(tasks)
              .then(fulfill)
              .catch(reject);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}
exports.deleteObject = (key, bucket, region, accessKeyId, secretAccessKey, sessionToken) => {
  return new Promise((fulfill, reject) => {
    try {
      let client = getClient(region, accessKeyId, secretAccessKey, sessionToken);
      const params = {
        Bucket: bucket,
        Key: key.toLowerCase(),
      }
      client.deleteObject(params, (err, data) => {
        if (err) reject(err);
        else {
          fulfill(data);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
exports.getObject = async (key, bucket, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  key = key.toLowerCase()
  let cachekey = String.toMD5(`s3_get_object_${key}_${bucket}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(cachekey);
  if (cached) return cached
  let content = await _getObject(key, bucket, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(cachekey, content, ttl || 600);
  return content
}
exports.putObject = async (key, data, bucket, acl, tags = [], region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  key = key.toLowerCase()
  let cachekey = String.toMD5(`s3_get_object_${key}_${bucket}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let res = await _putObject(key, data, bucket, acl, tags, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(cachekey, data, ttl || 600);
  return res
}