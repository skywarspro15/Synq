class App {
  constructor() {
    this.initialSongPath = "song.json";
    this.songData = null;
    this.state = { selectedTrack: null, selectedPattern: null };
    this.VOLUME_STORAGE_KEY = "dawMasterVolume";

    this.audioEngine = new AudioEngine(this);
    this.songPlayer = new SongPlayer(this.audioEngine);
    this.history = new HistoryManager(this);

    this.toolbar = new Toolbar(this);
    this.arrangement = new Arrangement(this);
    this.pianoRoll = new PianoRoll(this);
    this.mixer = new Mixer(this);
    this.pluginPicker = new PluginPicker();

    this.init();
  }

  async init() {
    try {
      const response = await fetch(this.initialSongPath);
      const initialData = await response.json();

      this.loadSongData(initialData, true);

      this.songPlayer.onRender = (time) => {
        this.arrangement.updatePlayhead(time);
        if (this.pianoRoll.window.style.display === "flex") {
          this.pianoRoll.updatePlayhead(time);
        }
      };

      const savedVolume = localStorage.getItem(this.VOLUME_STORAGE_KEY);
      const initialVolume = savedVolume ? parseFloat(savedVolume) : 80;
      this.toolbar.volumeSlider.value = initialVolume;
      this.setMasterVolume(initialVolume);
      console.log("DAW Initialized.");
    } catch (error) {
      console.error("Failed to initialize app:", error);
    }
  }

  async loadSongData(data, isInitialLoad = false) {
    this.songData = data;
    await this.audioEngine.loadProject(this.songData);
    await this.songPlayer.loadSong(this.songData);
    this.state.selectedTrack = this.songData.tracks[0]?.name;
    if (isInitialLoad) this.history.saveState();
    this.renderAllUI();
  }

  renderAllUI() {
    this.toolbar.render();
    this.arrangement.render();
    this.mixer.render();
    if (this.pianoRoll.window.style.display === "flex") this.pianoRoll.render();
  }

  performAction(actionFn) {
    actionFn();
    this.history.saveState();
    this.renderAllUI();
  }

  async performAudioGraphAction(actionFn) {
    actionFn();
    await this.audioEngine.loadProject(this.songData);
    this.history.saveState();
    this.renderAllUI();
  }

  async promptAddFxToTrack(trackName) {
    const availableFx = Object.keys(window.DAW_PLUGINS).filter(
      (p) => !window.DAW_PLUGINS[p].isInstrument
    );
    try {
      const pluginName = await this.pluginPicker.show(availableFx);
      await this.performAudioGraphAction(() => {
        const track = this.songData.tracks.find((t) => t.name === trackName);
        const FxPlugin = window.DAW_PLUGINS[pluginName];
        if (track && FxPlugin) {
          track.fx.push({
            plugin: pluginName,
            params: FxPlugin.getDefaults(),
          });
        }
      });
    } catch (error) {
      console.log(error); // User cancelled the picker
    }
  }

  removeFxFromTrack(trackName, fxIndex) {
    this.performAudioGraphAction(() => {
      const track = this.songData.tracks.find((t) => t.name === trackName);
      if (track && track.fx[fxIndex]) {
        track.fx.splice(fxIndex, 1);
      }
    });
  }

  toggleNoteLogic(pitch, time) {
    if (!this.state.selectedPattern) return;
    const pattern = this.songData.patterns[this.state.selectedPattern];
    const noteIndex = pattern.findIndex(
      (n) => n.pitch === pitch && n.time === time
    );
    if (noteIndex > -1) {
      pattern.splice(noteIndex, 1);
    } else {
      pattern.push({ time, pitch, duration: 0.25 });
    }
  }
  deleteNoteLogic(pitch, time) {
    if (!this.state.selectedPattern) return;
    const pattern = this.songData.patterns[this.state.selectedPattern];
    const noteIndex = pattern.findIndex(
      (n) => n.time === time && n.pitch === pitch
    );
    if (noteIndex > -1) {
      pattern.splice(noteIndex, 1);
    }
  }
  deleteClipLogic(patternName, startTime) {
    const clipIndex = this.songData.arrangement.findIndex(
      (c) => c.pattern === patternName && c.startTime === startTime
    );
    if (clipIndex > -1) {
      this.songData.arrangement.splice(clipIndex, 1);
      if (this.state.selectedPattern === patternName) {
        this.pianoRoll.hide();
      }
    }
  }

  setTrackVolume(trackName, volume) {
    const track = this.songData.tracks.find((t) => t.name === trackName);
    if (track) track.volume = volume;
    this.audioEngine.setTrackVolume(trackName, volume);
  }
  setTrackPan(trackName, pan) {
    const track = this.songData.tracks.find((t) => t.name === trackName);
    if (track) track.pan = pan;
    this.audioEngine.setTrackPan(trackName, pan);
  }

  setMasterVolume(volumeValue) {
    this.audioEngine.setMasterVolume(volumeValue / 100);
    localStorage.setItem(this.VOLUME_STORAGE_KEY, volumeValue);
  }

  selectPattern(patternName) {
    this.state.selectedPattern = patternName;
    if (patternName) {
      this.state.selectedTrack = this.songData.arrangement.find(
        (c) => c.pattern === patternName
      )?.track;
      this.pianoRoll.show();
    }
    this.renderAllUI();
  }
  auditionNote(pitch) {
    if (this.audioEngine.audioContext.state === "suspended") {
      this.audioEngine.audioContext.resume();
    }
    if (!this.state.selectedPattern) return;
    const trackName = this.songData.arrangement.find(
      (c) => c.pattern === this.state.selectedPattern
    )?.track;
    const instrumentName = this.songData.tracks.find(
      (t) => t.name === trackName
    )?.instrument;
    if (instrumentName) {
      this.audioEngine.auditionNote(instrumentName, pitch);
    }
  }
  togglePlayback() {
    if (this.audioEngine.audioContext.state === "suspended") {
      this.audioEngine.audioContext.resume();
    }
    this.songPlayer.isPlaying ? this.songPlayer.stop() : this.songPlayer.play();
    this.toolbar.render();
  }
  exportToJson() {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(this.songData, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = "song.json";
    a.click();
  }
  openPluginWindow(trackName, fxIndex) {
    const pluginKey = `${trackName}_fx_${fxIndex}`;
    const pluginInstance = this.audioEngine.activePlugins.get(pluginKey);
    if (!pluginInstance) return;
    const uiContent = pluginInstance.getUI();
    if (!uiContent) return;
    const win = document.createElement("div");
    win.className = "floating-window plugin-window";
    win.innerHTML = `<div class="window-header"><span>${pluginInstance.constructor.pluginName}</span><button class="window-close-btn">×</button></div>`;
    win.appendChild(uiContent);
    document.getElementById("plugin-windows-container").appendChild(win);
    win.style.display = "flex";
    win.querySelector(".window-close-btn").onclick = () => win.remove();
    const header = win.querySelector(".window-header");
    let isDragging = false,
      offsetX,
      offsetY;
    header.onmousedown = (e) => {
      isDragging = true;
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      window.onmousemove = (e) => {
        if (isDragging) {
          win.style.left = `${e.clientX - offsetX}px`;
          win.style.top = `${e.clientY - offsetY}px`;
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

document.addEventListener("DOMContentLoaded", () => new App());
