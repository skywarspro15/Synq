class Toolbar {
  constructor(app) {
    this.app = app;
    const container = document.getElementById("toolbar-container");

    container.innerHTML = `
            <button id="play-button" title="Play/Stop">►</button>
            <div class="control-group">
                <label for="bpm-input">BPM</label>
                <input type="number" id="bpm-input" title="Beats Per Minute">
            </div>
            <div class="control-group">
                <label for="master-volume">Volume</label>
                <input type="range" id="master-volume" min="0" max="100" title="Master Volume">
            </div>
            <button id="undo-button" disabled title="Undo (Ctrl+Z)">↶</button>
            <button id="redo-button" disabled title="Redo (Ctrl+Y)">↷</button>
            <button id="mixer-button" title="Show Mixer">Mixer</button>
            <button id="export-json-button" title="Export Song Data">Export</button>
        `;

    // Get references to all elements
    this.playButton = document.getElementById("play-button");
    this.bpmInput = document.getElementById("bpm-input");
    this.volumeSlider = document.getElementById("master-volume");
    this.undoButton = document.getElementById("undo-button");
    this.redoButton = document.getElementById("redo-button");
    this.mixerButton = document.getElementById("mixer-button");
    this.exportButton = document.getElementById("export-json-button");

    // Add event listeners
    this.playButton.onclick = () => this.app.togglePlayback();
    this.bpmInput.onchange = () =>
      this.app.performAction(() => {
        this.app.songData.bpm = parseInt(this.bpmInput.value, 10);
      });
    this.volumeSlider.oninput = () =>
      this.app.setMasterVolume(parseFloat(this.volumeSlider.value));
    this.undoButton.onclick = () => this.app.history.undo();
    this.redoButton.onclick = () => this.app.history.redo();
    this.mixerButton.onclick = () => this.app.mixer.show();
    this.exportButton.onclick = () => this.app.exportToJson();
  }

  render() {
    this.playButton.innerHTML = this.app.songPlayer.isPlaying ? "⏹" : "►";
    this.bpmInput.value = this.app.songData.bpm;
    this.undoButton.disabled = this.app.history.undoStack.length <= 1;
    this.redoButton.disabled = this.app.history.redoStack.length === 0;
  }
}
