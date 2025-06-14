class Toolbar {
  constructor(app) {
    this.app = app;
    const container = document.getElementById("toolbar-container");

    // ** THE FIX IS HERE **
    // First, create the HTML content of the toolbar.
    container.innerHTML = `
            <button id="play-button">Play</button>
            <div class="control-group">
                <label for="bpm-input">BPM</label>
                <input type="number" id="bpm-input">
            </div>
            <div class="control-group">
                <label for="master-volume">Volume</label>
                <input type="range" id="master-volume" min="0" max="100">
            </div>
            <button id="undo-button" disabled>Undo</button>
            <button id="redo-button" disabled>Redo</button>
            <button id="mixer-button">Mixer</button>
            <button id="export-json-button">Export JSON</button>
        `;

    // Now that the elements exist in the DOM, get references to them.
    this.playButton = document.getElementById("play-button");
    this.bpmInput = document.getElementById("bpm-input");
    this.volumeSlider = document.getElementById("master-volume");
    this.undoButton = document.getElementById("undo-button");
    this.redoButton = document.getElementById("redo-button");
    this.mixerButton = document.getElementById("mixer-button");
    this.exportButton = document.getElementById("export-json-button");

    // Finally, attach the event listeners.
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
    this.playButton.textContent = this.app.songPlayer.isPlaying
      ? "Stop"
      : "Play";
    this.bpmInput.value = this.app.songData.bpm;

    this.undoButton.disabled = this.app.history.undoStack.length <= 1;
    this.redoButton.disabled = this.app.history.redoStack.length === 0;
  }
}
