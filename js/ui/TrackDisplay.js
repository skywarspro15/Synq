import Html from "../libs/html.js";
import BaseWindow from "./BaseWindow.js";
import PianoRoll from "./PianoRoll.js";
import { createButton, createLabel, createSelect } from "./components.js";

const PIXELS_PER_BEAT = 40;
const TRACK_HEIGHT = 60;
const RULER_HEIGHT = 30;
const TRACK_HEADER_WIDTH = 100;
const DBL_CLICK_MS = 300;
const DRAG_Y_THRESHOLD = TRACK_HEIGHT / 2;

export default class TrackDisplay {
  constructor(songData, songPlayer, parentElement) {
    this.songData = songData;
    this.songPlayer = songPlayer;
    this.parentElement = parentElement;
    this.song = songPlayer.song;

    this.quantizeValue = 1 / 4;
    this.isMovingBlock = false;
    this.clickTimeout = null;

    const playButton = createButton("Play", () => this.songPlayer.togglePlay());
    const toolbar = this._createToolbar();
    const windowTitle = `Arrangement: ${this.song.title} | ${this.song.key} ${this.song.scale}`;

    this.window = new BaseWindow(windowTitle, this.parentElement, {
      controls: [playButton],
      toolbar,
    });

    this.playhead = null;
    this.renderContent();
    this.listenForPlaybackEvents();
  }

  _timeStringToSeconds(timeString) {
    const [bar, beat, tick] = timeString.split(":").map(Number);
    const beatsPerBar = parseInt(this.song.timeSignature.split("/")[0], 10);
    return (
      ((bar - 1) * beatsPerBar + (beat - 1) + tick / 480) *
      (60.0 / this.song.bpm)
    );
  }

  _secondsToTimeString(seconds) {
    const beatsPerBar = parseInt(this.song.timeSignature.split("/")[0]);
    const totalBeats = seconds / (60.0 / this.song.bpm);
    const bar = Math.floor(totalBeats / beatsPerBar) + 1;
    const beat = Math.floor(totalBeats % beatsPerBar) + 1;
    return `${bar}:${beat}:0`;
  }

  _getPatternDurationInSeconds(pattern) {
    let maxTime = 0;
    pattern.notes.forEach((note) => {
      const noteEndTime =
        this._timeStringToSeconds(note.startTime) + note.duration;
      if (noteEndTime > maxTime) maxTime = noteEndTime;
    });
    const beatsPerBar = parseInt(this.song.timeSignature.split("/")[0], 10);
    const secondsPerBar = (60.0 / this.song.bpm) * beatsPerBar;
    return Math.max(
      secondsPerBar,
      Math.ceil(maxTime / secondsPerBar) * secondsPerBar
    );
  }

  listenForPlaybackEvents() {
    this.songPlayer.on("play", () => {
      this.window.options.controls[0].text("Stop");
      this.playhead.style({ display: "block" });
    });
    this.songPlayer.on("stop", () => {
      this.window.options.controls[0].text("Play");
    });
    this.songPlayer.on("timeupdate", (time) => this.updatePlayhead(time));
  }

  updatePlayhead(timeInSeconds) {
    const pixels = timeInSeconds * (this.song.bpm / 60.0) * PIXELS_PER_BEAT;
    this.playhead.style({ transform: `translateX(${pixels}px)` });
  }

  enableRulerSeeking(ruler) {
    const seek = (e) => {
      const rect = ruler.elm.getBoundingClientRect();
      const x = e.clientX - rect.left + this.mainScroller.elm.scrollLeft;
      this.songPlayer.seek((x / PIXELS_PER_BEAT) * (60.0 / this.song.bpm));
    };
    ruler.on("mousedown", (e) => {
      seek(e);
      const onMove = (moveEvent) => seek(moveEvent);
      const onUp = () => document.removeEventListener("mousemove", onMove);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp, { once: true });
    });
  }

  enablePatternInteraction(blockDiv, blockData, pattern, startSeconds) {
    blockDiv.on("contextmenu", (e) => {
      e.preventDefault();
      const index = this.song.arrangement.indexOf(blockData);
      if (index > -1) {
        this.song.arrangement.splice(index, 1);
        this.songPlayer.rebuildNoteQueue();
        this.renderArrangement();
      }
    });

    blockDiv.on("mousedown", (e) => {
      e.stopPropagation();

      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
        const instrument = this.songPlayer.instruments.get(pattern.instrument);
        new PianoRoll(pattern, startSeconds, this.songPlayer, instrument, () =>
          this.songPlayer.rebuildNoteQueue()
        );
        return;
      }
      this.clickTimeout = setTimeout(() => {
        this.clickTimeout = null;
      }, DBL_CLICK_MS);

      let hasMovedEnough = false;
      const startX = e.clientX,
        startY = e.clientY;
      const initialLeft = blockDiv.elm.offsetLeft,
        initialTop = blockDiv.elm.offsetTop;

      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (!hasMovedEnough && Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5)
          return;
        if (this.clickTimeout) {
          clearTimeout(this.clickTimeout);
          this.clickTimeout = null;
        }
        this.isMovingBlock = true;

        const gridX = initialLeft + deltaX;
        const gridY = initialTop + deltaY;

        const beatPosition = Math.max(
          0,
          Math.round(gridX / PIXELS_PER_BEAT / this.quantizeValue) *
            this.quantizeValue
        );

        let trackIndex = Math.floor(initialTop / TRACK_HEIGHT);
        if (Math.abs(gridY - initialTop) > DRAG_Y_THRESHOLD) {
          trackIndex = Math.max(0, Math.floor(gridY / TRACK_HEIGHT));
        }

        blockDiv.style({
          transform: `translate(${
            beatPosition * PIXELS_PER_BEAT - initialLeft
          }px, ${trackIndex * TRACK_HEIGHT + 5 - initialTop}px)`,
        });
      };

      const onMouseUp = (upEvent) => {
        document.removeEventListener("mousemove", onMouseMove);
        if (!this.isMovingBlock) return;
        this.isMovingBlock = false;

        blockDiv.style({ transform: "translate(0,0)" });

        const finalLeft = initialLeft + (upEvent.clientX - startX);
        const finalTop = initialTop + (upEvent.clientY - startY);

        const beatPosition = Math.max(
          0,
          Math.round(finalLeft / PIXELS_PER_BEAT / this.quantizeValue) *
            this.quantizeValue
        );
        blockData.startTime = this._secondsToTimeString(
          beatPosition * (60.0 / this.song.bpm)
        );

        let trackIndex = this.song.tracks.findIndex(
          (t) => t.name === blockData.trackName
        );
        if (Math.abs(upEvent.clientY - startY) > DRAG_Y_THRESHOLD) {
          trackIndex = Math.floor(finalTop / TRACK_HEIGHT);
        }
        if (this.song.tracks[trackIndex])
          blockData.trackName = this.song.tracks[trackIndex].name;

        this.songPlayer.rebuildNoteQueue();
        this.renderArrangement();
      };

      document.addEventListener("mouseup", onMouseUp, { once: true });
      document.addEventListener("mousemove", onMouseMove);
    });
  }

  _createToolbar() {
    const toolbar = new Html("div");
    createLabel("Quantize:").appendTo(toolbar);
    createSelect(
      ["1/16", "1/8", "1/4", "1/2", "1", "2", "4"].map((v) => ({
        text: v,
        value: eval(v),
      })),
      (e) => (this.quantizeValue = parseFloat(e.target.value))
    )
      .val(this.quantizeValue)
      .appendTo(toolbar);
    return toolbar;
  }

  renderArrangement() {
    this.trackHeaders.clear();
    this.timelineLanes.clear();
    this.ruler.clear();

    const maxDurationSeconds = Math.max(
      ...this.song.arrangement.map(
        (b) =>
          this._timeStringToSeconds(b.startTime) +
          this._getPatternDurationInSeconds(this.song.patterns[b.patternName])
      ),
      32 * (60.0 / this.song.bpm)
    );
    const totalBeats = maxDurationSeconds / (60.0 / this.song.bpm);
    const totalWidth = totalBeats * PIXELS_PER_BEAT;
    const totalHeight = this.song.tracks.length * TRACK_HEIGHT;
    this.timelineContent.style({
      width: `${totalWidth}px`,
      height: `${totalHeight}px`,
    });

    for (let i = 0; i < totalBeats; i++) {
      if (i % 4 === 0) {
        new Html("div")
          .classOn("arrangement-ruler__tick")
          .style({ left: `${i * PIXELS_PER_BEAT}px` })
          .appendTo(this.ruler);
        new Html("span")
          .classOn("arrangement-ruler__label")
          .style({ left: `${i * PIXELS_PER_BEAT}px` })
          .text(i / 4 + 1)
          .appendTo(this.ruler);
      }
    }

    this.song.tracks.forEach((track) => {
      new Html("div")
        .classOn("arrangement-track-header__item")
        .text(track.name)
        .appendTo(this.trackHeaders);
      new Html("div")
        .classOn("arrangement-timeline__lane")
        .appendTo(this.timelineLanes);
    });

    this.song.arrangement.forEach((block) => {
      const trackIndex = this.song.tracks.findIndex(
        (t) => t.name === block.trackName
      );
      if (trackIndex === -1) return;
      const pattern = this.song.patterns[block.patternName];
      const instrument = this.songPlayer.instruments.get(pattern.instrument);
      const startSeconds = this._timeStringToSeconds(block.startTime);
      const durationSeconds = this._getPatternDurationInSeconds(pattern);
      const left = (startSeconds / (60.0 / this.song.bpm)) * PIXELS_PER_BEAT;
      const width =
        (durationSeconds / (60.0 / this.song.bpm)) * PIXELS_PER_BEAT;
      const top = trackIndex * TRACK_HEIGHT;

      const blockDiv = new Html("div")
        .classOn("arrangement-timeline__pattern-block")
        .style({
          left: `${left}px`,
          width: `${width - 2}px`,
          top: `${top + 5}px`,
        })
        .text(block.patternName)
        .appendTo(this.timelineLanes);

      this.enablePatternInteraction(blockDiv, block, pattern, startSeconds);
    });

    this.playhead.style({ height: `${totalHeight + RULER_HEIGHT}px` });
  }

  renderContent() {
    const contentArea = this.window.contentArea;
    contentArea.style({ display: "flex", overflow: "hidden" });

    this.trackHeaders = new Html("div")
      .classOn("arrangement-track-header")
      .style({ width: `${TRACK_HEADER_WIDTH}px` })
      .appendTo(contentArea);

    this.mainScroller = new Html("div")
      .style({ flex: 1, overflow: "auto" })
      .appendTo(contentArea);

    this.timelineContent = new Html("div")
      .style({ position: "relative" })
      .appendTo(this.mainScroller);

    this.ruler = new Html("div")
      .classOn("arrangement-ruler")
      .appendTo(this.timelineContent);
    this.timelineLanes = new Html("div")
      .style({ position: "relative" })
      .appendTo(this.timelineContent);
    this.playhead = new Html("div")
      .classOn("arrangement-playhead")
      .style({ display: "none" })
      .appendTo(this.timelineContent);

    this.mainScroller.on("scroll", () => {
      this.trackHeaders.elm.scrollTop = this.mainScroller.elm.scrollTop;
    });

    this.enableRulerSeeking(this.ruler);

    this.renderArrangement();
  }
}
