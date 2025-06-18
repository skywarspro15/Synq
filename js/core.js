import AudioEngine from "./AudioEngine.js";
import SongPlayer from "./SongPlayer.js";
import TrackDisplay from "./ui/TrackDisplay.js";

async function init() {
  const songData = {
    title: "House Beat (Sampler DEMO)",
    bpm: 127,
    timeSignature: "4/4",
    key: "G#",
    scale: "major",
    ticksPerBeat: 480,
    instruments: [
      {
        name: "Sampled Kick",
        id: 0,
        plugin: "./plugins/instruments/SamplerPlugin.js",
        params: {
          sampleUrl: "kick.wav",
        },
        volume: 0.5,
        pan: 0,
      },
      {
        name: "Sampled Clap",
        id: 1,
        plugin: "./plugins/instruments/SamplerPlugin.js",
        params: {
          sampleUrl: "clap.wav",
        },
        volume: 0.3,
        pan: 0,
      },
      {
        name: "Melody",
        id: 2,
        plugin: "./plugins/instruments/SamplerPlugin.js",
        params: { sampleUrl: "Pluck.wav" },
        volume: 0.8,
        pan: 0.1,
        // fx: [
        //   {
        //     plugin: "./plugins/effects/DelayEffect.js",
        //     params: { delayTime: 0.461, feedback: 0.3, wet: 0.3 },
        //   },
        //   {
        //     plugin: "./plugins/effects/PumperEffect.js",
        //     params: { rate: 4, depth: 1.0, release: 0.10 },
        //   },
        // ],
      },
      {
        name: "OSC Test",
        id: 3,
        plugin: "./plugins/instruments/BasicSynth.js",
        params: {waveform: "sine"},
        volume: 0.4,
        pan: 0,
      }
    ],
    // tracks: [{ name: "Kick" }, { name: "Clap" }, { name: "Melody" }],
    patterns: {
      kick_sampler_pattern: {
        notes: [
          { startTime: "1:1:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:2:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:3:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:4:0", pitch: "C2", duration: 0.1 },
        ],
      },
      clap_sampler_pattern: {
        notes: [
          { startTime: "1:2:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:4:0", pitch: "C2", duration: 0.1 },
        ],
      },
      synth_pattern: {
        notes: [{ startTime: "1:1:0", pitch: "C#4", duration: 15 }],
      },
      bass_pattern: {
        notes: [{ startTime: "1:1:0", pitch: "G#1", duration: 15 }]
      }
    },
    arrangement: [
      { patternName: "bass_pattern", startTime: "1:1:0", instrument: 3 },
      { patternName: "synth_pattern", startTime: "1:1:0", instrument: 2 },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "1:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "1:1:0",
      },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "2:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "2:1:0",
      },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "3:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "3:1:0",
      },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "4:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "4:1:0",
      },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "5:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "5:1:0",
      },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "6:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "6:1:0",
      },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "7:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "7:1:0",
      },
      {
        patternName: "kick_sampler_pattern",
				instrument: 0,
        startTime: "8:1:0",
      },
      {
        patternName: "clap_sampler_pattern",
				instrument: 1,
        startTime: "8:1:0",
      },
    ],
  };

  const curAudio = new AudioEngine();
  const sPlayer = new SongPlayer(songData, curAudio);
  await sPlayer.load();
  new TrackDisplay(songData, sPlayer, document.body);
}

init();
