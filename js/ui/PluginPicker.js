class PluginPicker {
  constructor() {
    this.modal = document.getElementById("plugin-picker-modal");
    this.list = document.getElementById("plugin-picker-list");
    this.closeBtn = this.modal.querySelector(".modal-close-btn");
    this.promise = {};

    this.modal.onclick = (e) => {
      if (e.target === this.modal) this.hide(true);
    };
    this.closeBtn.onclick = () => this.hide(true);
  }

  show(pluginList) {
    this.modal.style.display = "flex";
    this.list.innerHTML = "";

    for (const pluginName of pluginList) {
      const item = document.createElement("div");
      item.className = "plugin-picker-item";
      item.textContent = pluginName;
      item.dataset.pluginName = pluginName;
      this.list.appendChild(item);
    }

    return new Promise((resolve, reject) => {
      this.promise.resolve = resolve;
      this.promise.reject = reject;

      // This onclick handler is now correctly ordered
      this.list.onclick = (e) => {
        const pluginName = e.target.dataset.pluginName;
        if (pluginName) {
          // ** THE FIX IS HERE **
          // 1. Resolve the promise first, while this.promise.resolve still exists.
          if (this.promise.resolve) {
            this.promise.resolve(pluginName);
          }
          // 2. Then, hide the modal, which will clean up the promise object.
          this.hide(false);
        }
      };
    });
  }

  hide(isCancel = false) {
    this.modal.style.display = "none";
    if (isCancel && this.promise.reject) {
      this.promise.reject("Picker was cancelled");
    }
    // Clear the promise object for the next time it's shown
    this.promise = {};
  }
}
