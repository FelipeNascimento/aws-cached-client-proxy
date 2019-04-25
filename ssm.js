const AWS = require("../node_modules/aws-sdk");
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if (accessKeyId) options.accessKeyId = accessKeyId
  if (secretAccessKey) options.secretAccessKey = secretAccessKey
  if (sessionToken) options.sessionToken = sessionToken
  return new AWS.SSM(options);
}
exports.sendCommand = (params, region, accessKeyId, secretAccessKey, sessionToken) => {
  return new Promise((fulfill, reject) => {
    try {
      let ssm = getClient(region, accessKeyId, secretAccessKey, sessionToken);
      ssm.sendCommand(params, (err, data) => {
        if (err) reject(err);
        else fulfill(data.Command);
      });
    } catch (err) {
      reject(err);
    }
  });
}