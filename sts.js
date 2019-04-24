const AWS = require("aws-sdk");
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if(accessKeyId) options.accessKeyId = accessKeyId
  if(secretAccessKey) options.secretAccessKey = secretAccessKey
  if(sessionToken) options.sessionToken = sessionToken
  return new AWS.STS(options);
}
exports.assumeRole = function (params, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    client.assumeRole(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.Credentials);
    });
  });
}

