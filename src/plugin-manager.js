var ConfigFileManager = require('./config-file-manager'),
    fileManager = new ConfigFileManager('plugins.json'),
    npm = require('npm-programmatic'),
    path = require('path'),
    appRootPath = require('app-root-path').toString();

// Returns the plugin data object
module.exports.getPluginData = async function(network) {
  var pluginData = await fileManager.getProperty(network.toUpperCase());
  if(!pluginData) Error('Plugin not found for network: ' + network);
  return pluginData;
}

// Returns the actual plugin module
module.exports.getPlugin = async function(network) {
  var pluginData = await this.getPluginData(network.toUpperCase()),
      plugin = null;
  if (pluginData) {
    plugin = require(pluginData['package_name']);
  }
  return plugin;
}

// Returns wheter or not a plugin for this network exists
module.exports.pluginInstalled = function(network) {
  return fileManager.propertyExists(network.toUpperCase());
}

// Registers a plugin
module.exports.registerPlugin = async function(packageName) {
  await npm
          .install(packageName, {
            cwd: path.join(appRootPath),
            save: false
          });
  var plugin = require(packageName),
      pluginDefinition = plugin.getPluginDefinition();
  pluginDefinition['configuration'] = {};
  await fileManager.updateProperty(pluginDefinition.network, pluginDefinition);
  console.log(packageName + ' plugin installed succesfully');
}

// Removes a plugin
module.exports.removePlugin = async function(network) {
  var pluginData = await this.getPluginData(network);
  await npm
          .uninstall(pluginData['package_name'], {
            cwd: path.join(appRootPath),
            save: false
          });
  fileManager.deleteProperty(pluginData['network']);
  console.log(pluginData['package_name'] + ' plugin deleted succesfully');
}

// Return all plugins (with their configurations)
module.exports.listPlugins = async function() {
  return Object.values(await fileManager.getConfigFile());
}

function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

function parsePluginConfiguration(configuration) {
  var result = {};

  if (!isObject(configuration)) {
    throw "Invalid configuration, must be an Object";
  }

  const subnetworks = Object.keys(configuration);

  for (var i = 0; i < subnetworks.length; i++) {
    const subnetworkId = subnetworks[i];
    if (!isObject(configuration[subnetworkId]) && subnetworkId !== null && subnetworkId !== undefined) {
      throw "Invalid subnetwork configuration, must be an Object";
    }
    result[subnetworkId.toString()] = configuration[subnetworkId];
  }

  return result;
}

// Setup configuration object for plugin
module.exports.configurePlugin = async function(network, configuration) {
  var pluginData = await this.getPluginData(network);

  // Avoid plugin definition overwrites
  delete configuration['network'];
  delete configuration['version'];
  delete configuration['package_name'];

  // Update configuration
  pluginData['configuration'] = parsePluginConfiguration(configuration);
  fileManager.updateProperty(network, pluginData);
  console.log('Configuration set for plugin: ' + pluginData['package_name'] + ' with network: ' + pluginData['network']);
}

module.exports.getSupportedNetworks = async function() {
  return Object.keys(await fileManager.getConfigFile());
}

module.exports.isNetworkSupported = async function(network) {
  return Object.keys(await fileManager.getConfigFile()).includes(network.toUpperCase());
}

module.exports.getNetworks = async function() {
  var result = [];
  const configFile = await fileManager.getConfigFile();
  const configFileEntries = Object.entries(configFile);
  for (let i = 0; i < configFileEntries.length; i++) {
    const networkEntry = configFileEntries[i];
    const networkID = networkEntry[0];
    const networkConfig = networkEntry[1];
    const network = {
      network: networkID,
      version: networkConfig.version,
      package_name: networkConfig.package_name,
      subnetworks: Object.keys(networkConfig.configuration)
    }
    result.push(network);
  }
  return result;
}
