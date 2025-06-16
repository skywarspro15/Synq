import Html from "../libs/html.js";
import BaseWindow from "./BaseWindow.js";

const DEFAULT_PIXELS_PER_BEAT = 80;
const NOTE_HEIGHT = 13;
const KEYBOARD_WIDTH = 40;
const PITCH_NAMES = [
  "B",
  "A#",
  "A",
  "G#",
  "G",
  "F#",
  "F",
  "E",
  "D#",
  "D",
  "C#",
  "C",
];
const DEFAULT_NOTE_DURATION_S = 0.2;
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export default class PianoRoll {
  constructor(pattern, patternStartTime, songPlayer, instrument, onDataChange) {
    this.pattern = pattern;
    this.patternStartTime = patternStartTime;
    this.songPlayer = songPlayer;
    this.instrument = instrument;
    this.onDataChange = onDataChange;
    this.parentElement = document.body;
    this.song = songPlayer.song;

    this.window = new BaseWindow(
      `Piano Roll: ${pattern.instrument}`,
      this.parentElement,
      {
        top: "100px",
        left: "100px",
        width: "70%",
        height: "500px",
      }
    );

    this.selectedNote = null;
    this.isResizing = false;
    this.isMoving = false;
    this.quantizeValue = 1 / 4;
    this.scaleSnap = true;
    this.zoomLevel = 1.0;

    this.playhead = null;
    this.gridContainer = null;
    this.gridLinesContainer = null;
    this.notesContainer = null;

    this.patternDurationSeconds = this._getPatternDurationInSeconds();
    this.octaveRange = this._calculateOctaveRange();
    this.scaleNoteIndices = this._getScaleNoteIndices();

    this.renderContent();
    this.listenForPlaybackEvents();
  }

  get pixelsPerBeat() {
    return DEFAULT_PIXELS_PER_BEAT * this.zoomLevel;
  }

  _calculateOctaveRange() {
    if (this.pattern.notes.length === 0) return { min: 3, max: 6 };
    let minOctave = 9,
      maxOctave = 0;
    this.pattern.notes.forEach((note) => {
      const octave = parseInt(note.pitch.slice(-1), 10);
      if (octave < minOctave) minOctave = octave;
      if (octave > maxOctave) maxOctave = octave;
    });
    return { min: Math.max(0, minOctave - 1), max: Math.min(9, maxOctave + 1) };
  }

  _getScaleNoteIndices() {
    const rootNoteIndex = PITCH_NAMES.indexOf(this.song.key);
    const scaleIntervals = SCALES[this.song.scale] || SCALES.major;
    return scaleIntervals.map(
      (interval) => (rootNoteIndex - interval + 12) % 12
    );
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

  _secondsToTimeString(seconds) {
    const beatsPerBar = parseInt(this.song.timeSignature.split("/")[0]);
    const secondsPerBeat = 60.0 / this.song.bpm;
    const totalBeats = seconds / secondsPerBeat;
    const bar = Math.floor(totalBeats / beatsPerBar) + 1;
    const beat = Math.floor(totalBeats % beatsPerBar) + 1;
    const ticks = Math.round(
      (totalBeats * this.song.ticksPerBeat) % this.song.ticksPerBeat
    );
    return `${bar}:${beat}:${ticks}`;
  }

  _getPatternDurationInSeconds() {
    let maxTime = 0;
    this.pattern.notes.forEach((note) => {
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

  _pitchToY(pitch) {
    const noteName = pitch.slice(0, -1);
    const octave = parseInt(pitch.slice(-1), 10);
    const noteIndex = PITCH_NAMES.indexOf(noteName);
    const semitonesFromTop = (this.octaveRange.max - octave) * 12 + noteIndex;
    return semitonesFromTop * NOTE_HEIGHT;
  }

  _yToPitch(y, doScaleSnap = false) {
    let semitonesFromTop = Math.floor(y / NOTE_HEIGHT);
    if (doScaleSnap) {
      const noteIndexInOctave = semitonesFromTop % 12;
      const closestScaleNoteIndex = this.scaleNoteIndices.reduce((prev, curr) =>
        Math.abs(curr - noteIndexInOctave) < Math.abs(prev - noteIndexInOctave)
          ? curr
          : prev
      );
      semitonesFromTop =
        semitonesFromTop - noteIndexInOctave + closestScaleNoteIndex;
    }
    const octave = this.octaveRange.max - Math.floor(semitonesFromTop / 12);
    const noteIndex = semitonesFromTop % 12;
    return `${PITCH_NAMES[noteIndex]}${octave}`;
  }

  listenForPlaybackEvents() {
    const update = (globalTime) => {
      let timeSincePatternStart =
        (globalTime - this.patternStartTime) % this.patternDurationSeconds;
      if (globalTime < this.patternStartTime) timeSincePatternStart = -1;
      if (timeSincePatternStart >= 0) {
        this.playhead.style({ display: "block" });
        this.playhead.style({
          left: `${
            (timeSincePatternStart / (60.0 / this.song.bpm)) *
            this.pixelsPerBeat
          }px`,
        });
      } else {
        this.playhead.style({ display: "none" });
      }
    };
    this.songPlayer.on("timeupdate", update);
    this.songPlayer.on("stop", () => this.playhead.style({ display: "none" }));
    update(this.songPlayer.playheadPosition);
  }

  addNote(pitch, startTimeSeconds) {
    this.instrument.playImmediate({ pitch });
    const newNote = {
      startTime: this._secondsToTimeString(startTimeSeconds),
      pitch,
      duration: DEFAULT_NOTE_DURATION_S,
    };
    this.pattern.notes.push(newNote);
    this.onDataChange();
    this.renderNotes();
  }

  removeNote(noteObject) {
    if (this.selectedNote && this.selectedNote.data === noteObject)
      this.deselectNote();
    const index = this.pattern.notes.indexOf(noteObject);
    if (index > -1) {
      this.pattern.notes.splice(index, 1);
      this.onDataChange();
      this.renderNotes();
    }
  }

  deselectNote() {
    if (!this.selectedNote) return;
    this.selectedNote.element.style({ border: "1px solid #a3c9e8" });
    if (this.selectedNote.resizeHandle)
      this.selectedNote.resizeHandle.cleanup();
    this.selectedNote = null;
  }

  selectNote(noteDiv, noteData) {
    if (this.selectedNote && this.selectedNote.data === noteData) return;
    this.deselectNote();
    this.instrument.playImmediate({ pitch: noteData.pitch });
    this.selectedNote = {
      element: noteDiv,
      data: noteData,
      resizeHandle: null,
    };
    noteDiv.style({ border: "1px solid #ffdd88" });
    const resizeHandle = new Html("div")
      .style({
        position: "absolute",
        top: "0",
        right: "-3px",
        width: "6px",
        height: "100%",
        cursor: "ew-resize",
        "z-index": 11,
      })
      .appendTo(noteDiv);
    this.selectedNote.resizeHandle = resizeHandle;
    this.enableResizing(resizeHandle, noteDiv, noteData);
  }

  enableMoving(noteDiv, noteData) {
    noteDiv.on("mousedown", (e) => {
      if (this.isResizing) return;
      e.stopPropagation();
      this.isMoving = true;
      this.selectNote(noteDiv, noteData);
      const rect = this.gridContainer.elm.getBoundingClientRect();
      const mouseOffsetX = e.clientX - noteDiv.elm.getBoundingClientRect().left;
      const mouseOffsetY = e.clientY - noteDiv.elm.getBoundingClientRect().top;
      const secondsPerBeat = 60.0 / this.song.bpm;
      const onMouseMove = (moveEvent) => {
        if (!this.isMoving) return;
        const scrollLeft = this.window.contentArea.elm.scrollLeft;
        const scrollTop = this.window.contentArea.elm.scrollTop;
        const gridX = moveEvent.clientX - rect.left + scrollLeft - mouseOffsetX;
        const gridY = moveEvent.clientY - rect.top + scrollTop - mouseOffsetY;
        const snappedPitch = this._yToPitch(gridY, this.scaleSnap);
        const snappedTop = this._pitchToY(snappedPitch);
        const beatPosition = Math.max(
          0,
          Math.round(gridX / this.pixelsPerBeat / this.quantizeValue) *
            this.quantizeValue
        );
        const snappedLeft = beatPosition * this.pixelsPerBeat;
        noteDiv.style({ top: `${snappedTop}px`, left: `${snappedLeft}px` });
      };
      const onMouseUp = () => {
        this.isMoving = false;
        const finalTop = noteDiv.elm.offsetTop;
        const finalLeft = noteDiv.elm.offsetLeft;
        noteData.pitch = this._yToPitch(finalTop);
        const beatPosition = Math.max(0, finalLeft / this.pixelsPerBeat);
        noteData.startTime = this._secondsToTimeString(
          beatPosition * secondsPerBeat
        );
        this.onDataChange();
        this.renderNotes();
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  enableResizing(handle, noteElement, noteData) {
    handle.on("mousedown", (e) => {
      e.stopPropagation();
      this.isResizing = true;
      const secondsPerBeat = 60.0 / this.song.bpm;
      const startX = e.clientX;
      const startWidth = noteElement.elm.offsetWidth;
      const onMouseMove = (moveEvent) => {
        if (!this.isResizing) return;
        const deltaX = moveEvent.clientX - startX;
        noteElement.style({ width: `${Math.max(10, startWidth + deltaX)}px` });
      };
      const onMouseUp = () => {
        this.isResizing = false;
        const finalWidth = noteElement.elm.offsetWidth;
        const newDurationInBeats = Math.max(
          this.quantizeValue,
          Math.round(finalWidth / this.pixelsPerBeat / this.quantizeValue) *
            this.quantizeValue
        );
        noteData.duration = newDurationInBeats * secondsPerBeat;
        this.onDataChange();
        this.renderNotes();
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  redraw() {
    this.gridLinesContainer.clear();
    const totalBeats = this.patternDurationSeconds / (60.0 / this.song.bpm);
    const gridWidth = totalBeats * this.pixelsPerBeat;
    this.gridContainer.style({ width: `${gridWidth}px` });
    this.renderGridLines();
    this.renderNotes();
  }

  renderNotes() {
    this.notesContainer.clear();
    const secondsPerBeat = 60.0 / this.song.bpm;
    this.pattern.notes.forEach((note) => {
      const top = this._pitchToY(note.pitch);
      const startTimeInSeconds = this._timeStringToSeconds(note.startTime);
      const left = (startTimeInSeconds / secondsPerBeat) * this.pixelsPerBeat;
      const width = (note.duration / secondsPerBeat) * this.pixelsPerBeat;
      const noteDiv = new Html("div").style({
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        width: `${width - 2}px`,
        height: `${NOTE_HEIGHT - 2}px`,
        "background-color": "#6fa8dc",
        border: "1px solid #a3c9e8",
        cursor: "move",
        "border-radius": "2px",
        "box-sizing": "border-box",
        "z-index": 10,
        "margin-top": "1px",
      });
      this.enableMoving(noteDiv, note);
      noteDiv.on("mousedown", (e) => {
        e.stopPropagation();
        this.selectNote(noteDiv, note);
      });
      noteDiv.on("contextmenu", (e) => {
        e.preventDefault();
        this.removeNote(note);
      });
      noteDiv.appendTo(this.notesContainer);
      if (this.selectedNote && this.selectedNote.data === note)
        this.selectNote(noteDiv, note);
    });
  }

  renderGridLines() {
    this.gridLinesContainer.clear();
    const beatsPerBar = parseInt(this.song.timeSignature.split("/")[0], 10);
    const totalBeats = this.patternDurationSeconds / (60.0 / this.song.bpm);
    const gridHeight =
      (this.octaveRange.max - this.octaveRange.min + 1) * 12 * NOTE_HEIGHT;
    for (let i = 0; i < totalBeats; i++) {
      const isBarLine = i % beatsPerBar === 0;
      new Html("div")
        .style({
          position: "absolute",
          left: `${i * this.pixelsPerBeat}px`,
          top: 0,
          width: "1px",
          height: `${gridHeight}px`,
          "background-color": isBarLine ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
          "z-index": 1,
        })
        .appendTo(this.gridLinesContainer);
    }
  }

  renderControls() {
    const toolbar = new Html("div")
      .style({
        padding: "5px",
        "background-color": "#333",
        display: "flex",
        "align-items": "center",
        gap: "15px",
      })
      .prependTo(this.window.window);
    new Html("label")
      .text("Quantize:")
      .style({ "font-size": "12px" })
      .appendTo(toolbar);
    const quantizeSelect = new Html("select")
      .on(
        "change",
        () => (this.quantizeValue = parseFloat(quantizeSelect.getValue()))
      )
      .appendTo(toolbar);
    ["1/16", "1/8", "1/4", "1/2", "1"].forEach((val) =>
      new Html("option")
        .attr({ value: eval(val) })
        .text(val)
        .appendTo(quantizeSelect)
    );
    quantizeSelect.val(this.quantizeValue);
    const scaleSnapLabel = new Html("label")
      .style({
        display: "flex",
        "align-items": "center",
        gap: "5px",
        cursor: "pointer",
        "font-size": "12px",
      })
      .text("Scale Snap")
      .appendTo(toolbar);
    const scaleSnapCheck = new Html("input")
      .attr({ type: "checkbox" })
      .on("change", () => (this.scaleSnap = scaleSnapCheck.elm.checked))
      .prependTo(scaleSnapLabel);
    scaleSnapCheck.elm.checked = this.scaleSnap;
    new Html("label")
      .text("Zoom:")
      .style({ "font-size": "12px" })
      .appendTo(toolbar);
    new Html("input")
      .attr({
        type: "range",
        min: 0.5,
        max: 4,
        step: 0.1,
        value: this.zoomLevel,
      })
      .on("input", (e) => {
        this.zoomLevel = parseFloat(e.target.value);
        this.redraw();
      })
      .appendTo(toolbar);
  }

  renderContent() {
    this.renderControls();
    const content = this.window.contentArea;
    content.style({ "background-color": "#222", overflow: "auto" });

    const scrollingWrapper = new Html("div")
      .style({ position: "relative", display: "flex" })
      .appendTo(content);

    const keyboard = new Html("div")
      .style({
        width: `${KEYBOARD_WIDTH}px`,
        "flex-shrink": 0,
        "background-color": "#444",
        position: "sticky",
        top: 0,
        left: 0,
        "z-index": 25,
      })
      .appendTo(scrollingWrapper);

    this.gridContainer = new Html("div")
      .style({ position: "relative", "flex-grow": 1 })
      .appendTo(scrollingWrapper);

    const totalNoteSlots =
      (this.octaveRange.max - this.octaveRange.min + 1) * 12;
    const gridHeight = totalNoteSlots * NOTE_HEIGHT;
    this.gridContainer.style({ height: `${gridHeight}px` });

    const gridBackground = new Html("div")
      .style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        "z-index": 0,
      })
      .appendTo(this.gridContainer);

    for (let o = this.octaveRange.max; o >= this.octaveRange.min; o--) {
      PITCH_NAMES.forEach((noteName, i) => {
        const pitch = `${noteName}${o}`;
        const isBlackKey = noteName.includes("#");
        new Html("div")
          .style({
            height: `${NOTE_HEIGHT}px`,
            "background-color": isBlackKey ? "#555" : "#777",
            "box-sizing": "border-box",
            "border-bottom": "1px solid #333",
            cursor: "pointer",
          })
          .on("mousedown", () => this.instrument.playImmediate({ pitch }))
          .appendTo(keyboard);
        const noteIndexInOctave = i % 12;
        const isInScale = this.scaleNoteIndices.includes(noteIndexInOctave);
        let rowColor = isBlackKey ? "#2a2a2a" : "#3a3a3a";
        if (isInScale) rowColor = isBlackKey ? "#3a4a5a" : "#4a5a6a";
        new Html("div")
          .style({
            height: `${NOTE_HEIGHT}px`,
            "background-color": rowColor,
            "box-sizing": "border-box",
            "border-bottom": "1px solid #222",
          })
          .appendTo(gridBackground);
      });
    }

    this.gridLinesContainer = new Html("div")
      .style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        "pointer-events": "none",
      })
      .appendTo(this.gridContainer);
    this.notesContainer = new Html("div")
      .style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      })
      .appendTo(this.gridContainer);
    this.redraw();

    this.gridContainer.on("click", (e) => {
      if (this.isMoving) return;
      this.deselectNote();
      const scrollLeft = content.elm.scrollLeft;
      const scrollTop = content.elm.scrollTop;
      const rect = this.gridContainer.elm.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top + scrollTop;
      const pitch = this._yToPitch(y, this.scaleSnap);
      const secondsPerBeat = 60.0 / this.song.bpm;
      const beatPosition =
        Math.round(x / this.pixelsPerBeat / this.quantizeValue) *
        this.quantizeValue;
      this.addNote(pitch, beatPosition * secondsPerBeat);
    });

    this.playhead = new Html("div")
      .style({
        position: "absolute",
        top: "0",
        left: "0",
        width: "2px",
        height: `${gridHeight}px`,
        "background-color": "rgba(255, 80, 80, 0.8)",
        "z-index": 20,
        "pointer-events": "none",
        display: "none",
      })
      .appendTo(this.gridContainer);
  }
}
