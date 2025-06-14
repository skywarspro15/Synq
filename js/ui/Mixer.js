class Mixer {
  constructor(app) {
    this.app = app;
    this.window = document.getElementById("mixer-window");
    this.window.innerHTML = `
            <div class="window-header"><span>Mixer</span><button class="window-close-btn">×</button></div>
            <div id="mixer-container"></div>`;
    this.container = document.getElementById("mixer-container");

    this.window.querySelector(".window-close-btn").onclick = () => this.hide();
    this.initDrag();

    this.container.addEventListener("click", (e) => {
      if (e.target.matches(".edit-fx-btn")) {
        this.app.openPluginWindow(
          e.target.dataset.trackName,
          parseInt(e.target.dataset.fxIndex)
        );
      } else if (e.target.matches(".add-fx-btn")) {
        this.app.promptAddFxToTrack(e.target.dataset.trackName);
      } else if (e.target.matches(".remove-fx-btn")) {
        this.app.removeFxFromTrack(
          e.target.dataset.trackName,
          parseInt(e.target.dataset.fxIndex)
        );
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
      const fxItemsHtml = track.fx
        .map(
          (effect, index) =>
            `<div class="fx-item">
                    <span>${effect.plugin}</span>
                    <div>
                        <button class="edit-fx-btn" data-track-name="${track.name}" data-fx-index="${index}">Edit</button>
                        <button class="remove-fx-btn" data-track-name="${track.name}" data-fx-index="${index}" title="Remove FX">×</button>
                    </div>
                </div>`
        )
        .join("");

      const strip = document.createElement("div");
      strip.className = "channel-strip";
      strip.innerHTML = `
                <label>${track.name}</label>
                <input type="range" class="volume-slider" min="0" max="1.5" step="0.01" value="${
                  track.volume
                }">
                <br><br> <br> <br> 
                <div class="pan-control">
                    <label>PAN</label>
                    <input type="range" class="pan-slider" min="-1" max="1" step="0.01" value="${
                      track.pan
                    }">
                </div>
                <span class="pan-display">${parseFloat(track.pan).toFixed(
                  2
                )}</span>
                <div class="fx-list">${fxItemsHtml}</div>
                <div class="mixer-footer">
                    <button class="add-fx-btn" data-track-name="${
                      track.name
                    }">+ Add FX</button>
                </div>
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
