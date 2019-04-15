const AWS = require("aws-sdk");
const redis = require('./clients/redis');
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if (accessKeyId) options.accessKeyId = accessKeyId
  if (secretAccessKey) options.secretAccessKey = secretAccessKey
  if (sessionToken) options.sessionToken = sessionToken
  return new AWS.CloudWatch(options);
}
function _getMetricStatistics(metric, namespace, startTime, endTime, period, dimensions, statistics, unit, extendedStatistics, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      MetricName: metric,
      Namespace: namespace,
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      Dimensions: dimensions,
      Statistics: statistics,
      Unit: unit
    };
    if (extendedStatistics) params.ExtendedStatistics = extendedStatistics
    client.getMetricStatistics(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.Datapoints);
    });
  });
};
exports.getMetricStatistics = async (metric, namespace, startTime, endTime, period, dimensions, statistics, unit, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = `cloudwatch_get_metric_statistics_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${namespace}_${metric}_${unit}_${startTime}_${endTime}_${period}`
  key += dimensions.map(dim => `${dim.Name}_${dim.Value}`).join('_')
  key += statistics.join('_')
  key = String.toMD5(key)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let datapoints = await _getMetricStatistics(metric, namespace, startTime, endTime, period, dimensions, statistics, unit, null, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(datapoints), ttl || 300);
  return datapoints
}