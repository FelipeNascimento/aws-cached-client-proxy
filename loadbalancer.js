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
function _describeLoadBalancers(names, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      LoadBalancerNames: names
    };
    client.describeLoadBalancers(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.LoadBalancerDescriptions);
    });
  });
};
function _describeInstanceHealth(name, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      LoadBalancerName: name
    };
    client.describeInstanceHealth(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.InstanceStates);
    });
  });
};
exports.describeLoadBalancers = async (names, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = String.toMD5(`loadbalancers_describe_loadbalancers_${names.join('_')}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let loadbalancers = await _describeLoadBalancers(names, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(loadbalancers), ttl || 90);
  return loadbalancers
}
exports.describeInstanceHealth = async (name, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = String.toMD5(`loadbalancers_describe_instance_health_${name}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let states = await _describeInstanceHealth(name, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(states), ttl || 90);
  return states
}
exports.createLoadBalancerListeners = async (params, region, accessKeyId, secretAccessKey, sessionToken) => {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    client.createLoadBalancerListeners(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.Listeners);
    });
  });
}
exports.deleteLoadBalancerListeners = async (params, region, accessKeyId, secretAccessKey, sessionToken) => {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    client.deleteLoadBalancerListeners(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data);
    });
  });
}