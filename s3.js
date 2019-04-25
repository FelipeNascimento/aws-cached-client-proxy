const AWS = require("aws-sdk");
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if (accessKeyId) options.accessKeyId = accessKeyId
  if (secretAccessKey) options.secretAccessKey = secretAccessKey
  if (sessionToken) options.sessionToken = sessionToken
  return new AWS.S3(options);
}
exports.getObject = function (key, bucket, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    try {
      let client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
      client.getObject({
        Bucket: bucket,
        Key: key.toLowerCase()
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
exports.putObject = function (key, data, bucket, acl, tags = [], region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    try {
      const params = {
        Bucket: bucket,
        Key: key.toLowerCase(),
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