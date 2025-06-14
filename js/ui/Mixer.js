class Mixer {
  constructor(app) {
    this.app = app;
    this.window = document.getElementById("mixer-window");
    this.window.innerHTML = `
            <div class="window-header">
                <span>Mixer</span>
                <button class="window-close-btn">×</button>
            </div>
            <div id="mixer-container"></div>
        `;
    this.container = document.getElementById("mixer-container");

    this.window.querySelector(".window-close-btn").onclick = () => this.hide();
    this.initDrag();

    // ** THE FIX IS HERE **
    // The event listener is attached ONCE when the Mixer is created.
    // It listens for clicks on the container and checks if the clicked element was an "Edit" button.
    this.container.addEventListener("click", (e) => {
      if (e.target.classList.contains("edit-fx-btn")) {
        const trackName = e.target.dataset.trackName;
        const fxIndex = parseInt(e.target.dataset.fxIndex, 10);
        this.app.openPluginWindow(trackName, fxIndex);
      }
    });
  }

  show() {
    this.window.style.display = "flex";
    this.render();
  }

  hide() {
    this.window.style.display = "none";
  }

  render() {
    this.container.innerHTML = "";
    this.app.songData.tracks.forEach((track) => {
      const instrument = this.app.songData.instruments.find(
        (inst) => inst.name === track.instrument
      );
      const fxItemsHtml =
        track.fx
          .map(
            (effect, index) =>
              `<div class="fx-item">
                    <span>${effect.plugin}</span>
                    <button class="edit-fx-btn" data-track-name="${track.name}" data-fx-index="${index}">Edit</button>
                </div>`
          )
          .join("") || "";

      const strip = document.createElement("div");
      strip.className = "channel-strip";
      strip.innerHTML = `
                <label>${track.name}</label>
                <input type="range" class="volume-slider" min="0" max="1.5" step="0.01" value="${
                  track.volume
                }">
                <div class="pan-control">
                    <span>L</span>
                    <input type="range" class="pan-slider" min="-1" max="1" step="0.01" value="${
                      track.pan
                    }">
                    <span>R</span>
                </div>
                <span class="pan-display">${parseFloat(track.pan).toFixed(
                  2
                )}</span>
                <div class="fx-list">${fxItemsHtml}</div>
            `;

      const volumeSlider = strip.querySelector(".volume-slider");
      const panSlider = strip.querySelector(".pan-slider");
      const panDisplay = strip.querySelector(".pan-display");

      volumeSlider.oninput = () =>
        this.app.setTrackVolume(track.name, parseFloat(volumeSlider.value));
      panSlider.oninput = () => {
        const panValue = parseFloat(panSlider.value);
        this.app.setTrackPan(track.name, panValue);
        panDisplay.textContent = panValue.toFixed(2);
      };

      volumeSlider.onchange = () => this.app.history.saveState();
      panSlider.onchange = () => this.app.history.saveState();

      this.container.appendChild(strip);
    });
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
