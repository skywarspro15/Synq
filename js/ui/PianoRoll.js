class PianoRoll {
  constructor(app) {
    this.app = app;
    this.window = document.getElementById("piano-roll-window");
    this.window.innerHTML = `
            <div class="window-header"><span>Piano Roll</span><button class="window-close-btn">×</button></div>
            <div id="piano-roll-container"></div>`;
    this.header = this.window.querySelector(".window-header");
    this.container = document.getElementById("piano-roll-container");
    this.container.innerHTML = `
            <div id="piano-roll-content">
                <div id="piano-roll-keyboard"></div>
                <div id="piano-roll-grid-wrapper">
                    <div id="piano-roll-grid"></div>
                </div>
                <div class="playhead"></div>
            </div>`;
    this.content = document.getElementById("piano-roll-content");
    this.keyboard = document.getElementById("piano-roll-keyboard");
    this.gridWrapper = document.getElementById("piano-roll-grid-wrapper");
    this.grid = document.getElementById("piano-roll-grid");
    this.playhead = this.content.querySelector(".playhead");
    this.notes = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    this.BEAT_WIDTH = 100;
    this.OCTAVES = 7;
    this.initDrag();
    this.initScrollSync();
    this.window.querySelector(".window-close-btn").onclick = () => this.hide();
  }
  show() {
    this.window.style.display = "flex";
    this.render();
  }
  hide() {
    this.window.style.display = "none";
    this.app.selectPattern(null);
  }

  render() {
    if (!this.app.state.selectedPattern) return;
    this.header.querySelector(
      "span"
    ).textContent = `Piano Roll: ${this.app.state.selectedPattern}`;
    this.keyboard.innerHTML = "";
    this.grid.innerHTML = "";

    const pattern = this.app.songData.patterns[this.app.state.selectedPattern];

    for (let i = this.OCTAVES * 12 - 1; i >= 0; i--) {
      const noteName = this.notes[i % 12];
      const octave = Math.floor(i / 12);
      const pitch = `${noteName}${octave}`;
      const keyEl = document.createElement("div");
      keyEl.className = noteName.includes("#")
        ? "piano-key black"
        : "piano-key white";
      keyEl.textContent = pitch;
      this.keyboard.appendChild(keyEl);
      const rowEl = document.createElement("div");
      rowEl.className = "grid-row";
      rowEl.style.width = `${16 * this.BEAT_WIDTH}px`;

      rowEl.onmousedown = (e) => {
        e.preventDefault();
        const rect = rowEl.getBoundingClientRect();
        const x = e.clientX - rect.left + this.gridWrapper.scrollLeft;
        const time = Math.floor((x / this.BEAT_WIDTH) * 4) / 4;

        this.app.performAction(() => {
          if (e.button === 0) {
            // Left click
            this.app.toggleNoteLogic(pitch, time);
            this.app.auditionNote(pitch);
          } else if (e.button === 2) {
            // Right click
            this.app.deleteNoteLogic(pitch, time);
          }
        });
      };
      rowEl.oncontextmenu = (e) => e.preventDefault();
      this.grid.appendChild(rowEl);

      if (pattern) {
        pattern
          .filter((n) => n.pitch === pitch)
          .forEach((note) => {
            const noteEl = document.createElement("div");
            noteEl.className = "note";
            noteEl.style.left = `${note.time * this.BEAT_WIDTH}px`;
            noteEl.style.width = `${note.duration * this.BEAT_WIDTH}px`;
            rowEl.appendChild(noteEl);
          });
      }
    }
  }

  updatePlayhead(currentTime) {
    const beats = (currentTime * this.app.songData.bpm) / 60;
    const playheadVisualOffset = 200;
    this.gridWrapper.scrollLeft =
      beats * this.BEAT_WIDTH - playheadVisualOffset;
  }
  initScrollSync() {
    this.keyboard.onscroll = () => {
      this.gridWrapper.scrollTop = this.keyboard.scrollTop;
    };
    this.gridWrapper.onscroll = () => {
      this.keyboard.scrollTop = this.gridWrapper.scrollTop;
    };
  }
  initDrag() {
    const header = this.window.querySelector(".window-header");
    let isDragging = false,
      offsetX,
      offsetY;
    header.onmousedown = (e) => {
      isDragging = true;
      offsetX = e.clientX - this.window.offsetLeft;
      offsetY = e.clientY - this.window.offsetTop;
      window.onmousemove = (e) => {
        if (isDragging) {
          this.window.style.left = `${e.clientX - offsetX}px`;
          this.window.style.top = `${e.clientY - offsetY}px`;
        }
      };
      window.onmouseup = () => {
        isDragging = false;
        window.onmousemove = null;
        window.onmouseup = null;
      };
    };
  }
}
