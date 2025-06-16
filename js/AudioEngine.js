export default class AudioEngine {
  constructor() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.channelStrips = {};
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.activePlugins = new Map();
  }

  instantiatePlugin(name, playbackContext) {
    const plugin = window.DAW_PLUGINS[name];
    if (!plugin) {
      console.error(`Plugin "${name}" not found.`);
      return;
    }
    const instanceId = `${name}_${Date.now()}_${Math.random()}`;
    let retData = { pluginName: name, instanceId: instanceId };
    let retFunctions = {};

    if (plugin.isInstrument) {
      const instrumentInstance = new plugin(playbackContext);
      this.activePlugins.set(instanceId, instrumentInstance);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;
      const pannerNode = new StereoPannerNode(this.audioContext, { pan: 0 });
      pannerNode.connect(this.masterGain);
      gainNode.connect(pannerNode);
      this.channelStrips[instanceId] = {
        gain: gainNode,
        pan: pannerNode,
        lastNodeInChain: instrumentInstance,
      };
      instrumentInstance.connect(gainNode);
      retData.gain = gainNode;
      retData.pan = pannerNode;

      retFunctions = {
        setParams: (params) => {
          let inst = this.activePlugins.get(instanceId);
          if (inst && typeof inst.setParams === "function")
            inst.setParams(params);
        },
        playNote: (note) => {
          let inst = this.activePlugins.get(instanceId);
          if (inst) inst.play(note);
        },
        playImmediate: (note) => {
          let inst = this.activePlugins.get(instanceId);
          if (inst && typeof inst.playImmediate === "function")
            inst.playImmediate(note);
        },
        addEffect: async (effectName, fxPlaybackContext) => {
          const fxPlugin = window.DAW_PLUGINS[effectName];
          if (!fxPlugin) {
            console.error(`Effect plugin "${effectName}" not found.`);
            return;
          }
          const channelStrip = this.channelStrips[instanceId];
          if (!channelStrip) return;
          const fxInstance = new fxPlugin(fxPlaybackContext);
          this.activePlugins.set(
            `${instanceId}_fx_${effectName}_${Math.random()}`,
            fxInstance
          );
          channelStrip.lastNodeInChain.disconnect(gainNode);
          channelStrip.lastNodeInChain.connect(fxInstance.input);
          fxInstance.connect(gainNode);
          channelStrip.lastNodeInChain = fxInstance;
          return fxInstance;
        },
      };
    }
    return { ...retData, ...retFunctions };
  }
}
