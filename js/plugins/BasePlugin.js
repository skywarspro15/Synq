class BasePlugin {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.input = null; // Entry point for audio signal
    this.output = null; // Exit point for audio signal
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
  } // Return null if no UI
  destroy() {
    this.disconnect();
  }
}
