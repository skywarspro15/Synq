class Arrangement {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById("arrangement-container");
    this.container.innerHTML = `
            <div id="track-headers-container"></div>
            <div id="arrangement-grid-wrapper">
                <div id="timeline-ruler"></div>
                <div id="arrangement-grid"></div>
                <div class="playhead"></div>
            </div>
        `;
    this.headersContainer = document.getElementById("track-headers-container");
    this.gridWrapper = document.getElementById("arrangement-grid-wrapper");
    this.timelineRuler = document.getElementById("timeline-ruler");
    this.grid = document.getElementById("arrangement-grid");
    this.playhead = this.gridWrapper.querySelector(".playhead");

    this.BEAT_WIDTH = 100;
    this.NOTE_NAMES = {
      C: 0,
      "C#": 1,
      D: 2,
      "D#": 3,
      E: 4,
      F: 5,
      "F#": 6,
      G: 7,
      "G#": 8,
      A: 9,
      "A#": 10,
      B: 11,
    };

    this.gridWrapper.onscroll = () => {
      this.headersContainer.scrollTop = this.gridWrapper.scrollTop;
      this.timelineRuler.scrollLeft = this.gridWrapper.scrollLeft;
    };

    this.initDragToSeek();
  }

  // New: Add event listeners for dragging the playhead
  initDragToSeek() {
    const seek = (e) => {
      const rect = this.timelineRuler.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newBeat = Math.max(0, x / this.BEAT_WIDTH);
      this.app.seek(newBeat);
    };

    this.timelineRuler.onmousedown = (e) => {
      e.preventDefault();
      seek(e); // Seek on initial click

      const onMouseMove = (moveEvent) => seek(moveEvent);
      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };
  }

  // ... (pitchToMidi and createPatternSvg are unchanged) ...
  pitchToMidi(pitch) {
    const octave = parseInt(pitch.slice(-1), 10);
    const noteName = pitch.slice(0, -1);
    return this.NOTE_NAMES[noteName] + octave * 12;
  }
  createPatternSvg(pattern, duration) {
    if (!pattern || pattern.length === 0) return "";
    const minMidi = Math.min(...pattern.map((n) => this.pitchToMidi(n.pitch)));
    const maxMidi = Math.max(...pattern.map((n) => this.pitchToMidi(n.pitch)));
    const pitchSpan = Math.max(12, maxMidi - minMidi + 1);
    const notesSvg = pattern
      .map((note) => {
        const y = maxMidi - this.pitchToMidi(note.pitch);
        return `<rect x="${note.time}" y="${y}" width="${note.duration}" height="1"></rect>`;
      })
      .join("");
    return `<svg viewBox="0 0 ${duration} ${pitchSpan}" preserveAspectRatio="none">${notesSvg}</svg>`;
  }

  render() {
    this.grid.innerHTML = "";
    this.headersContainer.innerHTML = "";

    this.app.songData.tracks.forEach((track) => {
      const header = document.createElement("div");
      header.className = "track-header";
      header.textContent = track.name;
      this.headersContainer.appendChild(header);

      const row = document.createElement("div");
      row.className = "grid-row";
      this.grid.appendChild(row);

      const clips = this.app.songData.arrangement.filter(
        (c) => c.track === track.name
      );
      clips.forEach((clip) => {
        const pattern = this.app.songData.patterns[clip.pattern];
        if (!pattern) return;

        const patternDuration =
          pattern.reduce(
            (max, note) => Math.max(max, note.time + note.duration),
            0
          ) || 4;
        const repeatDuration = patternDuration * (clip.repeat || 1);

        const clipEl = document.createElement("div");
        clipEl.className = "pattern-clip";
        clipEl.style.left = `${clip.startTime * this.BEAT_WIDTH}px`;
        clipEl.style.width = `${repeatDuration * this.BEAT_WIDTH}px`;
        clipEl.innerHTML = this.createPatternSvg(pattern, patternDuration);

        if (clip.pattern === this.app.state.selectedPattern)
          clipEl.classList.add("selected");

        clipEl.onclick = (e) => {
          e.stopPropagation();
          this.app.selectPattern(clip.pattern);
        };
        clipEl.oncontextmenu = (e) => {
          e.preventDefault();
          this.app.performAction(() =>
            this.app.deleteClipLogic(clip.pattern, clip.startTime)
          );
        };
        row.appendChild(clipEl);
      });
    });

    // Render timeline ruler ticks
    const totalBeats = Math.ceil(this.app.songPlayer.songDurationBeats);
    this.timelineRuler.style.width = `${totalBeats * this.BEAT_WIDTH}px`;
  }

  updatePlayhead(currentTime) {
    const beats = (currentTime * this.app.songData.bpm) / 60;
    this.playhead.style.transform = `translateX(${beats * this.BEAT_WIDTH}px)`;
    this.playhead.style.height = `${this.gridWrapper.clientHeight}px`;
  }
}
