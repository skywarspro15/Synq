import BasePlugin from "../BasePlugin.js";

export default class PumperEffect extends BasePlugin {
  static pluginName = "Pumper";
  static isInstrument = false;

  constructor(playbackContext, initialParams = {}) {
    super(playbackContext);

    this.rate = 4;
    this.attack = 0.01;
    this.release = 0.15;
    this.depth = 0.7;

    this.gain = this.audioContext.createGain();
    this.input = this.gain;
    this.output = this.gain;
    this.id = "sc";

    this.setParams(initialParams);
  }

  setParams(params) {
    params.rate && (this.rate = params.rate);
    params.attack && (this.attack = params.attack);
    params.release && (this.release = params.release);
    params.depth && (this.depth = params.depth);
  }

  start(startTime) {
    const bpm = this.playbackContext.bpm;
    if (!bpm) return;

    const secondsPerBeat = 60.0 / bpm;
    const pumpIntervalSeconds = secondsPerBeat * (4 / this.rate);
    const scheduleLengthBeats = Math.ceil(
      600 / secondsPerBeat / pumpIntervalSeconds
    );

    this.gain.gain.setValueAtTime(1, startTime);

    for (let i = 0; i < scheduleLengthBeats; i++) {
      const beatTime = startTime + i * pumpIntervalSeconds;
      this.gain.gain.linearRampToValueAtTime(
        1 - this.depth,
        beatTime + this.attack
      );
      this.gain.gain.linearRampToValueAtTime(
        1,
        beatTime + this.attack + this.release
      );
    }
  }

  stop() {
    this.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.gain.gain.setValueAtTime(1, this.audioContext.currentTime);
  }
}
