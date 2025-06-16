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

    this.setParams(initialParams);
  }

  setParams(params) {
    if (params.rate !== undefined) this.rate = params.rate;
    if (params.attack !== undefined) this.attack = params.attack;
    if (params.release !== undefined) this.release = params.release;
    if (params.depth !== undefined) this.depth = params.depth;
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
