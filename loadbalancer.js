const AWS = require("aws-sdk");
const redis = require('./clients/redis');
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if (accessKeyId) options.accessKeyId = accessKeyId
  if (secretAccessKey) options.secretAccessKey = secretAccessKey
  if (sessionToken) options.sessionToken = sessionToken
  return new AWS.ELB(options);
}
function _describeInstanceHealth(region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      IncludeDeleted: false
    };
    client.describeInstanceHealth(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.InstanceStates);
    });
  });
};
exports.describeInstanceHealth = async (region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = String.toMD5(`beanstalk_describe_instance_health_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let states = await _describeInstanceHealth(region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(states), ttl || 90);
  return states
}