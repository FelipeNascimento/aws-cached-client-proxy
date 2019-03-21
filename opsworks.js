const AWS = require("aws-sdk");
const redis = require('./clients/redis');
function getClient(region, accessKeyId, secretAccessKey) {
  let options = {
    region: region
  };
  if (accessKeyId && secretAccessKey) {
    options.accessKeyId = accessKeyId;
    options.secretAccessKey = secretAccessKey;
  }
  return new AWS.OpsWorks(options);
}
function _describeInstances(params, region, accessKeyId, secretAccessKey) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey)
    client.describeInstances(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.Instances);
    });
  });
};

exports.describeInstances = async (layerId, region, accessKeyId, secretAccessKey) => {
  let key = `opsworks_describe_instances_${region}_${layerId}_${accessKeyId || ''}_${secretAccessKey || ''}`
  let cached = await redis.get(key);
  if(cached) return JSON.parse(cached)
  let params = { LayerId: layerId }
  let instances = await _describeInstances(params, region,accessKeyId,secretAccessKey)
  await redis.set(key,JSON.stringify(instances),90);
  return instances
}