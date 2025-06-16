import Html from "../libs/html.js";
import BaseWindow from "./BaseWindow.js";
import {
  createLabel,
  createSelect,
  createCheckbox,
  createSlider,
} from "./components.js";

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
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

export default class PianoRoll {
  constructor(pattern, patternStartTime, songPlayer, instrument, onDataChange) {
    this.pattern = pattern;
    this.patternStartTime = patternStartTime;
    this.songPlayer = songPlayer;
    this.instrument = instrument;
    this.onDataChange = onDataChange;
    this.parentElement = document.body;
    this.song = songPlayer.song;

    const toolbar = this._createToolbar();
    this.window = new BaseWindow(
      `Piano Roll: ${pattern.instrument}`,
      this.parentElement,
      {
        top: "100px",
        left: "100px",
        width: "70%",
        height: "500px",
        toolbar,
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
    return ((bar - 1) * 4 + (beat - 1) + tick / 480) * (60.0 / this.song.bpm);
  }

  _secondsToTimeString(seconds) {
    const totalBeats = seconds / (60.0 / this.song.bpm);
    const bar = Math.floor(totalBeats / 4) + 1;
    const beat = Math.floor(totalBeats % 4) + 1;
    const ticks = Math.round((totalBeats * 480) % 480);
    return `${bar}:${beat}:${ticks}`;
  }

  _getPatternDurationInSeconds() {
    let maxTime = 0;
    this.pattern.notes.forEach((note) => {
      const noteEndTime =
        this._timeStringToSeconds(note.startTime) + note.duration;
      if (noteEndTime > maxTime) maxTime = noteEndTime;
    });
    return Math.max(
      (60.0 / this.song.bpm) * 4,
      Math.ceil(maxTime / ((60.0 / this.song.bpm) * 4)) *
        ((60.0 / this.song.bpm) * 4)
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
    const updateRef = update.bind(this);
    this.songPlayer.on("timeupdate", updateRef);
    this.songPlayer.on("stop", () => this.playhead.style({ display: "none" }));
    this.window.onClose = () => {
      this.songPlayer.off("timeupdate", updateRef);
    };
    update(this.songPlayer.playheadPosition);
  }

  addNote(pitch, startTimeSeconds) {
    this.instrument.playImmediate({ pitch });
    this.pattern.notes.push({
      startTime: this._secondsToTimeString(startTimeSeconds),
      pitch,
      duration: DEFAULT_NOTE_DURATION_S,
    });
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
    this.selectedNote.element.classOff("selected");
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
    noteDiv.classOn("selected");
    const resizeHandle = new Html("div")
      .classOn("piano-roll__note-resize-handle")
      .on(
        "mouseover",
        (e) => (e.target.style.backgroundColor = "rgba(255,255,100,0.3)")
      )
      .on("mouseout", (e) => (e.target.style.backgroundColor = "transparent"))
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
      const onMouseMove = (moveEvent) => {
        if (!this.isMoving) return;
        const scrollLeft = this.window.contentArea.elm.scrollLeft,
          scrollTop = this.window.contentArea.elm.scrollTop;
        const gridX = moveEvent.clientX - rect.left + scrollLeft - mouseOffsetX;
        const gridY = moveEvent.clientY - rect.top + scrollTop - mouseOffsetY;
        const snappedPitch = this._yToPitch(gridY, this.scaleSnap);
        const snappedTop = this._pitchToY(snappedPitch);
        const beatPosition = Math.max(
          0,
          Math.round(gridX / this.pixelsPerBeat / this.quantizeValue) *
            this.quantizeValue
        );
        noteDiv.style({
          top: `${snappedTop}px`,
          left: `${beatPosition * this.pixelsPerBeat}px`,
        });
      };
      const onMouseUp = () => {
        this.isMoving = false;
        noteData.pitch = this._yToPitch(noteDiv.elm.offsetTop);
        const beatPosition = Math.max(
          0,
          noteDiv.elm.offsetLeft / this.pixelsPerBeat
        );
        noteData.startTime = this._secondsToTimeString(
          beatPosition * (60.0 / this.song.bpm)
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
      const startX = e.clientX,
        startWidth = noteElement.elm.offsetWidth;
      const onMouseMove = (moveEvent) => {
        if (!this.isResizing) return;
        noteElement.style({
          width: `${Math.max(10, startWidth + (moveEvent.clientX - startX))}px`,
        });
      };
      const onMouseUp = () => {
        this.isResizing = false;
        const newDurationInBeats = Math.max(
          this.quantizeValue,
          Math.round(
            noteElement.elm.offsetWidth /
              this.pixelsPerBeat /
              this.quantizeValue
          ) * this.quantizeValue
        );
        noteData.duration = newDurationInBeats * (60.0 / this.song.bpm);
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
    this.gridContainer.style({
      width: `${
        (this.patternDurationSeconds / (60.0 / this.song.bpm)) *
        this.pixelsPerBeat
      }px`,
    });
    this.renderGridLines();
    this.renderNotes();
  }

  renderNotes() {
    this.notesContainer.clear();
    const secondsPerBeat = 60.0 / this.song.bpm;
    this.pattern.notes.forEach((note) => {
      const top = this._pitchToY(note.pitch);
      const left =
        (this._timeStringToSeconds(note.startTime) / secondsPerBeat) *
        this.pixelsPerBeat;
      const width = (note.duration / secondsPerBeat) * this.pixelsPerBeat;
      const noteDiv = new Html("div")
        .classOn("piano-roll__note")
        .style({ top: `${top}px`, left: `${left}px`, width: `${width - 2}px` });
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

  _createToolbar() {
    const toolbar = new Html("div");
    createLabel("Quantize:").appendTo(toolbar);
    createSelect(
      ["1/16", "1/8", "1/4", "1/2", "1"].map((v) => ({
        text: v,
        value: eval(v),
      })),
      (e) => (this.quantizeValue = parseFloat(e.target.value))
    )
      .val(this.quantizeValue)
      .appendTo(toolbar);
    createCheckbox(
      "Scale Snap",
      this.scaleSnap,
      (e) => (this.scaleSnap = e.target.checked)
    ).appendTo(toolbar);
    createLabel("Zoom:").appendTo(toolbar);
    createSlider(
      { min: 0.5, max: 4, step: 0.1, value: this.zoomLevel },
      (e) => {
        this.zoomLevel = parseFloat(e.target.value);
        this.redraw();
      }
    ).appendTo(toolbar);
    return toolbar;
  }

  renderContent() {
    const content = this.window.contentArea;
    const scrollingWrapper = new Html("div")
      .classOn("piano-roll__scrolling-wrapper")
      .appendTo(content);

    // Z-INDEX FIX: Keyboard z-index must be higher than the playhead's z-index.
    const keyboard = new Html("div")
      .classOn("piano-roll__keyboard")
      .style({ "z-index": 21 })
      .appendTo(scrollingWrapper);

    this.gridContainer = new Html("div")
      .classOn("piano-roll__grid-container")
      .appendTo(scrollingWrapper);
    const gridHeight =
      (this.octaveRange.max - this.octaveRange.min + 1) * 12 * NOTE_HEIGHT;
    this.gridContainer.style({ height: `${gridHeight}px` });

    const gridBackground = new Html("div")
      .classOn("piano-roll__grid-background")
      .appendTo(this.gridContainer);

    for (let o = this.octaveRange.max; o >= this.octaveRange.min; o--) {
      PITCH_NAMES.forEach((noteName, i) => {
        const pitch = `${noteName}${o}`;
        const isBlackKey = noteName.includes("#");
        new Html("div")
          .classOn("piano-roll__keyboard-key")
          .style({ "background-color": isBlackKey ? "#555" : "#777" })
          .on("mousedown", () => this.instrument.playImmediate({ pitch }))
          .appendTo(keyboard);
        const isInScale = this.scaleNoteIndices.includes(i % 12);
        let rowColor = isBlackKey ? "#2a2a2a" : "#3a3a3a";
        if (isInScale) rowColor = isBlackKey ? "#3a4a5a" : "#4a5a6a";
        new Html("div")
          .classOn("piano-roll__grid-row")
          .style({ "background-color": rowColor })
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
      const scrollLeft = scrollingWrapper.elm.scrollLeft,
        scrollTop = scrollingWrapper.elm.scrollTop;
      const rect = this.gridContainer.elm.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top + scrollTop;
      const pitch = this._yToPitch(y, this.scaleSnap);
      const beatPosition =
        Math.round(x / this.pixelsPerBeat / this.quantizeValue) *
        this.quantizeValue;
      this.addNote(pitch, beatPosition * (60.0 / this.song.bpm));
    });

    // Z-INDEX FIX: The playhead's z-index is now correctly placed.
    this.playhead = new Html("div")
      .classOn("piano-roll-playhead")
      .style({ height: `${gridHeight}px`, display: "none" })
      .appendTo(this.gridContainer);
  }
}
