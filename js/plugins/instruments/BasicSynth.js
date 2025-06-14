class BasicSynth extends BasePlugin {
  static pluginName = "BasicSynth";
  static isInstrument = true; // This is an instrument plugin

  constructor(audioContext, initialParams = {}) {
    super(audioContext);

    this.oscillator = this.audioContext.createOscillator();
    this.gain = this.audioContext.createGain();

    this.oscillator.connect(this.gain);
    this.output = this.gain;

    this.gain.gain.value = 0;
    this.setParams(initialParams);
    this.oscillator.start();
  }

  setParams(params) {
    if (params.waveform) {
      this.oscillator.type = params.waveform;
    }
  }

  play({ pitch, time, duration }) {
    const freq = this.hertz(pitch);
    if (!freq) return;

    const attackTime = 0.02;
    const releaseTime = 0.3;

    this.oscillator.frequency.setValueAtTime(freq, time);
    this.gain.gain.cancelScheduledValues(time);
    this.gain.gain.setValueAtTime(0, time);
    this.gain.gain.linearRampToValueAtTime(0.5, time + attackTime);
    this.gain.gain.linearRampToValueAtTime(0, time + duration + releaseTime);
  }

  getUI() {
    const container = document.createElement("div");
    container.className = "plugin-ui-content";
    container.innerHTML = `<h3>BasicSynth</h3><p>Waveform: <select id="waveform"><option>sine</option><option>square</option><option>sawtooth</option><option>triangle</option></select></p>`;

    const selector = container.querySelector("#waveform");
    selector.value = this.oscillator.type;
    selector.onchange = () => {
      this.setParams({ waveform: selector.value });
    };
    return container;
  }

  hertz(pitch) {
    const NOTES = {
      C: 261.63,
      "C#": 277.18,
      D: 293.66,
      "D#": 311.13,
      E: 329.63,
      F: 349.23,
      "F#": 369.99,
      G: 392.0,
      "G#": 415.3,
      A: 440.0,
      "A#": 466.16,
      B: 493.88,
    };
    const octave = parseInt(pitch.slice(-1));
    const noteName = pitch.slice(0, -1);
    if (NOTES[noteName]) {
      return NOTES[noteName] * Math.pow(2, octave - 4);
    }
    return null;
  }
}
registerPlugin(BasicSynth);
