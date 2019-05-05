const AWS = require("aws-sdk");
const redis = require('./clients/redis');
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if (accessKeyId) options.accessKeyId = accessKeyId
  if (secretAccessKey) options.secretAccessKey = secretAccessKey
  if (sessionToken) options.sessionToken = sessionToken
  return new AWS.CostExplorer(options);
}
function _getCostAndUsage(params, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    client.getCostAndUsage(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.ResultsByTime);
    });
  });
};
exports.getCostAndUsage = async (params, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = `costexplorer_get_cost_and_usage_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`
  key += JSON.stringify(params)
  key = String.toMD5(key)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let results = await _getCostAndUsage(params, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(results), ttl || 300);
  return results
}