import BasePlugin from "../BasePlugin.js";

export default class SamplerPlugin extends BasePlugin {
  static pluginName = "Sampler";
  static isInstrument = true;

  constructor(playbackContext, initialParams = {}) {
    super(playbackContext);
    this.audioBuffer = null;
    this.sourceUrl = null;
    this.isLoading = false;
    this.syncMode = null;
    this.gain = this.audioContext.createGain();
    this.output = this.gain;
    this.setParams(initialParams);
  }

  setParams(params) {
    if (params.sampleUrl && params.sampleUrl !== this.sourceUrl)
      this._loadSample(params.sampleUrl);
    if (params.sync) this.syncMode = params.sync;
  }

  async _loadSample(url) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.sourceUrl = url;
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error(`Failed to load or decode sample from ${url}:`, error);
      this.audioBuffer = null;
      this.sourceUrl = null;
    } finally {
      this.isLoading = false;
    }
  }

  play({ time, duration }) {
    if (!this.audioBuffer || this.isLoading) return;
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.gain);
    let offset = 0;
    if (this.syncMode === "transport")
      offset = time % this.audioBuffer.duration;
    const playDuration = duration || this.audioBuffer.duration - offset;
    const attackTime = 0.005,
      releaseTime = 0.01;
    this.gain.gain.cancelScheduledValues(time);
    this.gain.gain.setValueAtTime(0, time);
    this.gain.gain.linearRampToValueAtTime(1, time + attackTime);
    this.gain.gain.setValueAtTime(1, time + playDuration - releaseTime);
    this.gain.gain.linearRampToValueAtTime(0, time + playDuration);
    this.source.start(time, offset, playDuration);
  }

  playImmediate({ pitch, duration }) {
    this.play({ time: this.audioContext.currentTime, duration });
  }

  stop() {
    this.source && this.source.stop()
  }

  getUI() {
    const container = document.createElement("div");
    container.className = "plugin-ui-content";
    const url = this.sourceUrl || "No sample loaded";
    container.innerHTML = `<h3>Sampler</h3><p>Current Sample: <strong>${url}</strong></p><p><label for="sample-url">New Sample URL:</label><input type="text" id="sample-url" style="width: 80%;"></p><button id="load-sample-btn">Load</button>`;
    const input = container.querySelector("#sample-url");
    const button = container.querySelector("#load-sample-btn");
    button.onclick = () => {
      if (input.value) this.setParams({ sampleUrl: input.value });
    };
    return container;
  }
}
