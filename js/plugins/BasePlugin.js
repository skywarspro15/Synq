export default class BasePlugin {
  constructor(playbackContext = {}) {
    this.playbackContext = playbackContext;
    this.audioContext =
      playbackContext.audioContext ||
      new (window.AudioContext || window.webkitAudioContext)();
    this.input = null;
    this.output = null;
    this.id = "editme"; // adding id because id-ing through names is weird
  }

  static isInstrument = false;

  static getDefaults() {
    return {};
  }

  /**
   * Called by the SongPlayer when playback starts.
   * @param {number} startTime The AudioContext time when playback began.
   */
  start(startTime) {
    /* Should be implemented by subclasses if they need to react to playback start */
  }

  /**
   * Called by the SongPlayer when playback stops.
   */
  stop() {
    /* Should be implemented by subclasses if they need to react to playback stop */
  }

  /**
   * Plays a note immediately, outside of the main song transport.
   * Used for UI feedback like clicking notes in the piano roll.
   * @param {object} note - e.g. { pitch, duration }
   */
  playImmediate(note) {
    /* Should be implemented by instrument subclasses */
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
