window.DAW_PLUGINS = {};

export default class PluginManager {
  constructor() {
    this.plugins = window.DAW_PLUGINS;
  }
  async registerPlugin(pluginPath) {
    let pluginModule = await import(pluginPath);
    let pluginClass = pluginModule.default;
    // console.log("plugin:", pluginClass);
    if (pluginClass.pluginName) {
      window.DAW_PLUGINS[pluginClass.pluginName] = pluginClass;
      return pluginClass.pluginName;
    } else {
      console.error(
        "Plugin class is missing a static 'pluginName' property.",
        pluginClass
      );
    }
  }
}
