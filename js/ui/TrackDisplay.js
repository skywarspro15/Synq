import Html from "../libs/html.js";
import BaseWindow from "./BaseWindow.js";
import PianoRoll from "./PianoRoll.js";

const PIXELS_PER_BEAT = 40;
const TRACK_HEADER_WIDTH = 100;
const TRACK_HEIGHT = 60;

export default class TrackDisplay {
  constructor(songData, songPlayer, parentElement) {
    this.songData = songData;
    this.songPlayer = songPlayer;
    this.parentElement = parentElement;
    this.song = songPlayer.song;
    this.window = new BaseWindow(
      `Arrangement: ${this.song.title} | ${this.song.key} ${this.song.scale}`,
      this.parentElement
    );
    this.playButton = null;
    this.playhead = null;
    this.timelineScrubber = null;
    this.trackLaneElements = new Map();
    this.renderContent();
    this.listenForPlaybackEvents();
    this.enableSeeking();
  }

  _timeStringToSeconds(timeString) {
    const [bar, beat, tick] = timeString.split(":").map(Number);
    const beatsPerBar = parseInt(this.song.timeSignature.split("/")[0], 10);
    const secondsPerBeat = 60.0 / this.song.bpm;
    const ticksPerBeat = this.song.ticksPerBeat || 480;
    return (
      ((bar - 1) * beatsPerBar + (beat - 1) + tick / ticksPerBeat) *
      secondsPerBeat
    );
  }

  _timeStringToBeats(timeString) {
    const [bar, beat, tick] = timeString.split(":").map(Number);
    const beatsPerBar = parseInt(this.song.timeSignature.split("/")[0], 10);
    const ticksPerBeat = this.song.ticksPerBeat || 480;
    return (bar - 1) * beatsPerBar + (beat - 1) + tick / ticksPerBeat;
  }

  _getPatternDurationInBeats(pattern) {
    let maxBeat = 0;
    pattern.notes.forEach((note) => {
      const noteStartInBeats = this._timeStringToBeats(note.startTime);
      const noteEndInBeats =
        noteStartInBeats + note.duration / (60.0 / this.song.bpm);
      if (noteEndInBeats > maxBeat) maxBeat = noteEndInBeats;
    });
    return Math.ceil(maxBeat);
  }

  updatePlayhead(timeInSeconds) {
    const secondsPerBeat = 60.0 / this.song.bpm;
    this.playhead.style({
      left: `${(timeInSeconds / secondsPerBeat) * PIXELS_PER_BEAT}px`,
    });
  }

  listenForPlaybackEvents() {
    this.songPlayer.on("play", () => {
      this.playButton.text("Stop");
      this.playhead.style({ display: "block" });
    });
    this.songPlayer.on("stop", () => {
      this.playButton.text("Play");
    });
    this.songPlayer.on("timeupdate", (time) => this.updatePlayhead(time));
  }

  enableSeeking() {
    let isSeeking = false;
    let wasPlaying = false;
    const onMouseDown = (e) => {
      if (e.target !== this.timelineScrubber.elm) return;
      isSeeking = true;
      wasPlaying = this.songPlayer.isPlaying;
      if (wasPlaying) this.songPlayer.stop();
      const rect = this.timelineScrubber.elm.getBoundingClientRect();
      const scrollLeft = this.timelineScrubber.elm.parentElement.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const seekTime = (x / PIXELS_PER_BEAT) * (60.0 / this.song.bpm);
      this.songPlayer.seek(seekTime);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (e) => {
      if (!isSeeking) return;
      const rect = this.timelineScrubber.elm.getBoundingClientRect();
      const scrollLeft = this.timelineScrubber.elm.parentElement.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const seekTime = (x / PIXELS_PER_BEAT) * (60.0 / this.song.bpm);
      this.songPlayer.seek(seekTime);
    };
    const onMouseUp = () => {
      isSeeking = false;
      if (wasPlaying) this.songPlayer.play();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    this.timelineScrubber.on("mousedown", onMouseDown);
  }

  renderContent() {
    this.playButton = new Html("button")
      .text("Play")
      .style({
        "margin-left": "20px",
        padding: "5px 15px",
        "border-radius": "4px",
        border: "1px solid #666",
        "background-color": "#555",
        color: "#eee",
        cursor: "pointer",
      })
      .on("click", () => this.songPlayer.togglePlay())
      .appendTo(this.window.header);
    const contentArea = this.window.contentArea;
    contentArea.style({ display: "flex", overflow: "hidden" });
    const trackHeaders = new Html("div")
      .style({
        "flex-shrink": "0",
        width: `${TRACK_HEADER_WIDTH}px`,
        "overflow-y": "auto",
        "background-color": "#333",
      })
      .appendTo(contentArea);
    const timelineContent = new Html("div")
      .style({
        flex: "1",
        position: "relative",
        overflow: "auto",
        "padding-left": "10px",
      })
      .appendTo(contentArea);
    this.timelineScrubber = new Html("div")
      .style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        cursor: "text",
        "z-index": "99",
      })
      .appendTo(timelineContent);
    this.playhead = new Html("div")
      .style({
        position: "absolute",
        top: "0",
        left: "0",
        width: "2px",
        height: "100%",
        "background-color": "rgba(255, 0, 0, 0.7)",
        "z-index": "100",
        display: "none",
        "pointer-events": "none",
      })
      .appendTo(timelineContent);

    this.song.tracks.forEach((track) => {
      new Html("div")
        .style({
          height: `${TRACK_HEIGHT}px`,
          "line-height": `${TRACK_HEIGHT}px`,
          "padding-left": "10px",
          "font-weight": "bold",
          "border-bottom": "1px solid #444",
          "box-sizing": "border-box",
        })
        .text(track.name)
        .appendTo(trackHeaders);
      const lane = new Html("div")
        .style({
          position: "relative",
          height: `${TRACK_HEIGHT}px`,
          "border-bottom": "1px solid #444",
          "box-sizing": "border-box",
        })
        .appendTo(timelineContent);
      this.trackLaneElements.set(track.name, lane);
    });

    this.song.arrangement.forEach((block) => {
      const parentLane = this.trackLaneElements.get(block.trackName);
      if (!parentLane) return;
      const pattern = this.song.patterns[block.patternName];
      const instrument = this.songPlayer.instruments.get(pattern.instrument);
      const startBeats = this._timeStringToBeats(block.startTime);
      const durationBeats = this._getPatternDurationInBeats(pattern);
      const left = startBeats * PIXELS_PER_BEAT;
      const width = durationBeats * PIXELS_PER_BEAT;
      const blockStartTimeSeconds = this._timeStringToSeconds(block.startTime);

      new Html("div")
        .style({
          position: "absolute",
          top: "5px",
          left: `${left}px`,
          width: `${width - 2}px`,
          height: `${TRACK_HEIGHT - 10}px`,
          "background-color": "#5a98d1",
          border: "1px solid #8ac0ef",
          "border-radius": "4px",
          "box-sizing": "border-box",
          overflow: "hidden",
          "white-space": "nowrap",
          "padding-left": "5px",
          "line-height": `${TRACK_HEIGHT - 10}px`,
          "font-size": "12px",
          cursor: "pointer",
          "z-index": 101,
        })
        .text(block.patternName)
        .on("click", () => {
          new PianoRoll(
            pattern,
            blockStartTimeSeconds,
            this.songPlayer,
            instrument,
            () => {
              this.songPlayer.rebuildNoteQueue();
            }
          );
        })
        .appendTo(parentLane);
    });
  }
}
