import BasePlugin from "../BasePlugin.js";

export default class FilterEffect extends BasePlugin {
  static pluginName = "Filter";

  static getDefaults() {
    return {
      type: "lowpass",
      frequency: 12000,
      q: 1,
    };
  }

  constructor(audioContext, initialParams = {}) {
    super(audioContext);
    this.filterNode = this.audioContext.createBiquadFilter();
    this.input = this.filterNode;
    this.output = this.filterNode;
    this.setParams({ ...FilterEffect.getDefaults(), ...initialParams });
  }

  setParams(params) {
    if (params.frequency !== undefined)
      this.filterNode.frequency.value = params.frequency;
    if (params.q !== undefined) this.filterNode.Q.value = params.q;
    if (params.type !== undefined) this.filterNode.type = params.type;
  }

  getUI() {
    const container = document.createElement("div");
    container.className = "plugin-ui-content";
    container.innerHTML = `
            <h3>Filter</h3>
            <p>Freq: <input type="range" class="freq" min="20" max="20000" step="1"></p>
            <p>Q: <input type="range" class="q" min="0.1" max="20" step="0.1"></p>
        `;
    const freqSlider = container.querySelector(".freq");
    const qSlider = container.querySelector(".q");

    freqSlider.value = this.filterNode.frequency.value;
    qSlider.value = this.filterNode.Q.value;

    freqSlider.oninput = () =>
      this.setParams({ frequency: parseFloat(freqSlider.value) });
    qSlider.oninput = () => this.setParams({ q: parseFloat(qSlider.value) });
    return container;
  }
}
