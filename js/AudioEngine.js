class AudioEngine {
  constructor(app) {
    this.app = app;
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.channelStrips = {};
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.activePlugins = new Map();
  }

  async loadProject(songData) {
    this.destroyAllPlugins();
    this.createChannelStrips(songData.tracks);
    this.instantiatePlugins(songData.tracks);
  }

  destroyAllPlugins() {
    this.activePlugins.forEach((plugin) => plugin.destroy());
    this.activePlugins.clear();
  }

  createChannelStrips(tracks) {
    this.channelStrips = {};
    tracks.forEach((track) => {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = track.volume !== undefined ? track.volume : 1.0;
      const pannerNode = new StereoPannerNode(this.audioContext, {
        pan: track.pan || 0,
      });
      gainNode.connect(pannerNode).connect(this.masterGain);
      this.channelStrips[track.name] = { gain: gainNode, pan: pannerNode };
    });
  }

  instantiatePlugins(tracks) {
    tracks.forEach((track) => {
      const instrumentData = this.app.songData.instruments.find(
        (i) => i.name === track.instrument
      );
      if (!instrumentData) return;

      const InstrumentPlugin = window.DAW_PLUGINS[instrumentData.plugin];
      if (!InstrumentPlugin) return;

      const instrumentInstance = new InstrumentPlugin(
        this.audioContext,
        instrumentData.params
      );
      this.activePlugins.set(track.instrument, instrumentInstance);

      let lastNode = instrumentInstance;
      track.fx.forEach((fxData, index) => {
        const FxPlugin = window.DAW_PLUGINS[fxData.plugin];
        if (!FxPlugin) return;

        const fxInstance = new FxPlugin(this.audioContext, fxData.params);
        const pluginKey = `${track.name}_fx_${index}`;
        this.activePlugins.set(pluginKey, fxInstance);
        lastNode.connect(fxInstance.input);
        lastNode = fxInstance;
      });

      const channelStrip = this.channelStrips[track.name];
      if (channelStrip) {
        lastNode.connect(channelStrip.gain);
      }
    });
  }

  play(instrumentName, playArgs) {
    const instrument = this.activePlugins.get(instrumentName);
    if (instrument && instrument.play) {
      instrument.play({
        ...playArgs,
        time: this.audioContext.currentTime + playArgs.wait,
      });
    }
  }

  auditionNote(instrumentName, pitch) {
    const instrument = this.activePlugins.get(instrumentName);
    if (instrument && instrument.play) {
      instrument.play({
        pitch: pitch,
        duration: 0.3,
        time: this.audioContext.currentTime,
        wait: 0,
      });
    }
  }

  setTrackVolume(trackName, volume) {
    if (this.channelStrips[trackName])
      this.channelStrips[trackName].gain.gain.value = volume;
  }
  setTrackPan(trackName, pan) {
    if (this.channelStrips[trackName])
      this.channelStrips[trackName].pan.pan.value = pan;
  }
  setMasterVolume(level) {
    if (this.masterGain)
      this.masterGain.gain.setValueAtTime(level, this.audioContext.currentTime);
  }

  stopAll() {
    this.activePlugins.forEach((plugin) => {
      if (plugin.gain) {
        // A simple way to check if it's a synth
        plugin.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
        plugin.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      }
    });
  }
}
