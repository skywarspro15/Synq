window.DAW_PLUGINS = {};

// Every plugin JS file will call this to make itself available to the app
window.registerPlugin = (pluginClass) => {
  if (pluginClass.pluginName) {
    window.DAW_PLUGINS[pluginClass.pluginName] = pluginClass;
  } else {
    console.error(
      "Plugin class is missing a static 'pluginName' property.",
      pluginClass
    );
  }
};
