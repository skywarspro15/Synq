class DelayEffect extends BasePlugin {
  static pluginName = "Delay";

  constructor(audioContext, initialParams = {}) {
    super(audioContext);
    this.delayNode = this.audioContext.createDelay(1.0);
    this.feedbackNode = this.audioContext.createGain();
    this.wetNode = this.audioContext.createGain();
    this.input = this.audioContext.createGain();
    this.output = this.audioContext.createGain();

    this.input.connect(this.delayNode);
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.wetNode);
    this.wetNode.connect(this.output);
    this.input.connect(this.output);

    this.setParams(initialParams);
  }

  setParams(params) {
    if (params.delayTime !== undefined)
      this.delayNode.delayTime.value = params.delayTime;
    if (params.feedback !== undefined)
      this.feedbackNode.gain.value = params.feedback;
    if (params.wet !== undefined) this.wetNode.gain.value = params.wet;
  }

  // ** THE FIX IS HERE **
  getUI() {
    const container = document.createElement("div");
    container.className = "plugin-ui-content";
    container.innerHTML = `
            <h3>Delay</h3>
            <p>Time: <input type="range" class="delay-time" min="0" max="1" step="0.01"></p>
            <p>Feedback: <input type="range" class="feedback" min="0" max="0.9" step="0.01"></p>
            <p>Wet Mix: <input type="range" class="wet" min="0" max="1" step="0.01"></p>
        `;

    const timeSlider = container.querySelector(".delay-time");
    const feedbackSlider = container.querySelector(".feedback");
    const wetSlider = container.querySelector(".wet");

    timeSlider.value = this.delayNode.delayTime.value;
    feedbackSlider.value = this.feedbackNode.gain.value;
    wetSlider.value = this.wetNode.gain.value;

    timeSlider.oninput = () =>
      this.setParams({ delayTime: parseFloat(timeSlider.value) });
    feedbackSlider.oninput = () =>
      this.setParams({ feedback: parseFloat(feedbackSlider.value) });
    wetSlider.oninput = () =>
      this.setParams({ wet: parseFloat(wetSlider.value) });

    return container;
  }
}
registerPlugin(DelayEffect);
