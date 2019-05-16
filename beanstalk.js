const AWS = require("aws-sdk");
const redis = require('./clients/redis');
function getClient(region, accessKeyId, secretAccessKey, sessionToken) {
  let options = {
    region: region || "us-east-1"
  };
  if (accessKeyId) options.accessKeyId = accessKeyId
  if (secretAccessKey) options.secretAccessKey = secretAccessKey
  if (sessionToken) options.sessionToken = sessionToken
  return new AWS.ElasticBeanstalk(options);
}
function _describeEnvironments(params, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    client.describeEnvironments(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.Environments);
    });
  });
};
function _describeEnvironmentResources(params, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    client.describeEnvironmentResources(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.EnvironmentResources);
    });
  });
};
function _describeConfigurationSettings(application, name, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      ApplicationName: application,
      EnvironmentName: name
    };
    client.describeConfigurationSettings(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.ConfigurationSettings[0]);
    });
  });
};
exports.describeEnvironments = async (params, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = String.toMD5(`beanstalk_describe_environments_${JSON.stringify(params)}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let environments = await _describeEnvironments(params, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(environments), ttl || 90);
  return environments
}
exports.describeEnvironmentResources = async (params, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = String.toMD5(`beanstalk_describe_environment_resources_${JSON.stringify(params)}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let resources = await _describeEnvironmentResources(params, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(resources), ttl || 120);
  return resources
};
exports.describeConfigurationSettings = async (application, name, region, accessKeyId, secretAccessKey, sessionToken,ttl) => {
  let key = String.toMD5(`beanstalk_describeconfiguration_settings_${application}_${name}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  let configs = await _describeConfigurationSettings(application, name, region, accessKeyId, secretAccessKey, sessionToken)
  await redis.set(key, JSON.stringify(configs), ttl || 120);
  return configs
};
exports.getEnvironmentsFromApplication = function (application, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      ApplicationName: application,
      IncludeDeleted: false
    };
    client.describeEnvironments(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data.Environments);
    });
  });
};
exports.describeApplicationVersions = function (application, labels, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      ApplicationName: application,
      VersionLabels: labels
    };
    client.describeApplicationVersions(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data);
    });
  });
}
exports.getEnvironmentByName = async (name, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = String.toMD5(`beanstalk_get_environment_by_name_${name}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  var params = {
    EnvironmentNames: [name],
    IncludeDeleted: true
  };
  let environments = await this.describeEnvironments(params, region, accessKeyId, secretAccessKey, sessionToken, ttl)
  let environment = environments.find(x => x.EnvironmentName === name)
  if(environment) await redis.set(key, JSON.stringify(environment), ttl || 90);
  return environment
}
exports.getEnvironmentById = async (id, region, accessKeyId, secretAccessKey, sessionToken, ttl) => {
  let key = String.toMD5(`beanstalk_get_environment_by_id_${id}_${region || 'us-east-1'}_${accessKeyId || ''}_${secretAccessKey || ''}_${sessionToken || ''}`)
  let cached = await redis.get(key);
  if (cached) return JSON.parse(cached)
  var params = {
    EnvironmentIds: [id],
    IncludeDeleted: true
  };
  let environments = await this.describeEnvironments(params, region, accessKeyId, secretAccessKey, sessionToken, ttl)
  let environment = environments.find(x => x.EnvironmentId === id)
  if(environment) await redis.set(key, JSON.stringify(environment), ttl || 90);
  return environment
}

exports.getResources = function (name, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      EnvironmentName: name
    };
    client.describeEnvironmentResources(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data);
    });
  });
};
exports.terminateEnvironmentByName = function (name, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      EnvironmentName: name
    };
    client.terminateEnvironment(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data);
    });
  });
};
exports.terminateEnvironmentById = function (id, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    var params = {
      EnvironmentId: id
    };
    client.terminateEnvironment(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data);
    });
  });
};
exports.updateEnvironment = function (params, region, accessKeyId, secretAccessKey, sessionToken) {
  return new Promise((fulfill, reject) => {
    const client = getClient(region, accessKeyId, secretAccessKey, sessionToken)
    client.updateEnvironment(params, function (err, data) {
      if (err) reject(err, err.stack);
      else fulfill(data);
    });
  });
}

