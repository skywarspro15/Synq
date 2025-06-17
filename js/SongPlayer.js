import PluginManager from "./PluginManager.js";
import EventEmitter from "./libs/EventEmitter.js";

const LOOKAHEAD_TIME_S = 0.1;

export default class SongPlayer extends EventEmitter {
  constructor(songData, audioEngine) {
    super();
    this.song = songData;
    this.audioEngine = audioEngine;
    this.pluginManager = new PluginManager();
    this.instruments = new Map();
    this.isLoaded = false;
    this.isPlaying = false;
    this.noteQueue = [];
    this.nextNoteIndex = 0;
    this.playheadPosition = 0;
    this.previousPlayheadPosition = 0;
    this.playbackStartTime = 0;
    this.sequencerTimerId = null;
    this.playbackContext = {
      bpm: this.song.bpm,
      timeSignature: this.song.timeSignature,
      audioContext: this.audioEngine.audioContext,
      getPlayheadPosition: () => this.playheadPosition,
    };
  }

  _timeStringToSeconds(timeString) {
    const [bar, beat, tick] = timeString.split(":").map(Number);
    const { bpm, timeSignature, ticksPerBeat } = this.song;
    const beatsPerBar = parseInt(timeSignature.split("/")[0], 10);
    const secondsPerBeat = 60.0 / bpm;
    const totalBeats =
      (bar - 1) * beatsPerBar + (beat - 1) + tick / ticksPerBeat;
    return totalBeats * secondsPerBeat;
  }

  _prepareNoteQueue() {
    this.noteQueue = [];
    for (const block of this.song.arrangement) {
      const pattern = this.song.patterns[block.patternName];
      const instrument = this.instruments.get(pattern.instrument);
      const blockStartTime = this._timeStringToSeconds(block.startTime);
      if (!instrument) continue;
      for (const note of pattern.notes) {
        const noteStartTime = this._timeStringToSeconds(note.startTime);
        this.noteQueue.push({
          time: blockStartTime + noteStartTime,
          instrument: instrument,
          pitch: note.pitch,
          duration: note.duration,
        });
      }
    }
    this.noteQueue.sort((a, b) => a.time - b.time);
  }

  /**
   * Called by the UI after a note has been added/removed.
   */
  rebuildNoteQueue() {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stop();
    this._prepareNoteQueue();
    if (wasPlaying) this.play();
  }

  async load() {
    console.log("Loading song:", this.song.title);
    for (const inst of this.song.instruments) {
      const pluginName = await this.pluginManager.registerPlugin(inst.plugin);
      const instrumentInstance = await this.audioEngine.instantiatePlugin(
        pluginName,
        this.playbackContext
      );
      if (inst.params) instrumentInstance.setParams(inst.params);
      instrumentInstance.gain.gain.value = inst.volume;
      if (instrumentInstance.pan) instrumentInstance.pan.pan.value = inst.pan;
      if (inst.fx && inst.fx.length > 0) {
        for (const effect of inst.fx) {
          const fxPluginName = await this.pluginManager.registerPlugin(
            effect.plugin
          );
          const fxInstance = await instrumentInstance.addEffect(
            fxPluginName,
            this.playbackContext
          );
          if (effect.params && typeof fxInstance.setParams === "function")
            fxInstance.setParams(effect.params);
        }
      }
      this.instruments.set(inst.name, instrumentInstance);
    }
    this._prepareNoteQueue();
    this.isLoaded = true;
  }

  _sequencerLoop() {
    if (!this.isPlaying) return;
    const contextTime = this.audioEngine.audioContext.currentTime;
    const scheduleUntilTime = contextTime + LOOKAHEAD_TIME_S;
    while (
      this.nextNoteIndex < this.noteQueue.length &&
      this.playbackStartTime + this.noteQueue[this.nextNoteIndex].time <
        scheduleUntilTime
    ) {
      const note = this.noteQueue[this.nextNoteIndex];
      note.instrument.playNote({
        pitch: note.pitch,
        duration: note.duration,
        time: this.playbackStartTime + note.time,
      });
      this.nextNoteIndex++;
    }
    this.playheadPosition = contextTime - this.playbackStartTime;
    this.emit("timeupdate", this.playheadPosition);
    this.sequencerTimerId = setTimeout(() => this._sequencerLoop(), 25);
  }

  play() {
    if (!this.isLoaded || this.isPlaying) return;
    this.previousPlayheadPosition = this.playheadPosition;
    this.isPlaying = true;
    if (this.audioEngine.audioContext.state === "suspended")
      this.audioEngine.audioContext.resume();
    this.playbackStartTime =
      this.audioEngine.audioContext.currentTime - this.playheadPosition;
    this.audioEngine.activePlugins.forEach((p) =>
      p.start(this.playbackStartTime)
    );
    
    this.seek(this.playheadPosition);
    this._sequencerLoop();
    this.emit("play");
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    clearTimeout(this.sequencerTimerId);
    this.audioEngine.activePlugins.forEach((p) => p.stop());
    this.playheadPosition =
      this.audioEngine.audioContext.currentTime - this.playbackStartTime;
    this.seek(this.previousPlayheadPosition);
    this.emit("stop");
  }

  togglePlay() {
    if (this.isPlaying) this.stop();
    else this.play();
  }

  seek(timeInSeconds) {
    const newPosition = Math.max(0, timeInSeconds);
    this.playheadPosition = newPosition;
    if (this.isPlaying)
      this.playbackStartTime =
        this.audioEngine.audioContext.currentTime - this.playheadPosition;
    this.nextNoteIndex = 0;
    while (
      this.nextNoteIndex < this.noteQueue.length &&
      this.noteQueue[this.nextNoteIndex].time < newPosition
    ) {
      this.nextNoteIndex++;
    }
    this.emit("timeupdate", this.playheadPosition);
  }
}
