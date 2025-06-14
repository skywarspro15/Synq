class BasePlugin {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.input = null;
    this.output = null;
  }

  // A plugin is an effect by default
  static isInstrument = false;

  static getDefaults() {
    return {};
  }

  connect(destination) {
    if (this.output && destination) {
      this.output.connect(destination);
    }
  }

  disconnect() {
    if (this.output) {
      this.output.disconnect();
    }
  }

  setParams(params) {
    /* Should be implemented by subclasses */
  }
  getUI() {
    return null;
  }
  destroy() {
    this.disconnect();
  }
}
