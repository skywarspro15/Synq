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
        plugin: "./plugins/instruments/SamplerPlugin.js",
        params: {
          sampleUrl: "kick.wav",
        },
        volume: 0.5,
        pan: 0,
      },
      {
        name: "Sampled Clap",
        plugin: "./plugins/instruments/SamplerPlugin.js",
        params: {
          sampleUrl: "clap.wav",
        },
        volume: 0.3,
        pan: 0,
      },
      {
        name: "Melody",
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
    ],
    tracks: [{ name: "Kick" }, { name: "Clap" }, { name: "Melody" }],
    patterns: {
      kick_sampler_pattern: {
        instrument: "Sampled Kick",
        notes: [
          { startTime: "1:1:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:2:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:3:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:4:0", pitch: "C2", duration: 0.1 },
        ],
      },
      clap_sampler_pattern: {
        instrument: "Sampled Clap",
        notes: [
          { startTime: "1:2:0", pitch: "C2", duration: 0.1 },
          { startTime: "1:4:0", pitch: "C2", duration: 0.1 },
        ],
      },
      synth_pattern: {
        instrument: "Melody",
        notes: [{ startTime: "1:1:0", pitch: "C#4", duration: 15 }],
      },
    },
    arrangement: [
      { trackName: "Melody", patternName: "synth_pattern", startTime: "1:1:0" },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "1:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
        startTime: "1:1:0",
      },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "2:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
        startTime: "2:1:0",
      },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "3:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
        startTime: "3:1:0",
      },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "4:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
        startTime: "4:1:0",
      },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "5:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
        startTime: "5:1:0",
      },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "6:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
        startTime: "6:1:0",
      },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "7:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
        startTime: "7:1:0",
      },
      {
        trackName: "Kick",
        patternName: "kick_sampler_pattern",
        startTime: "8:1:0",
      },
      {
        trackName: "Clap",
        patternName: "clap_sampler_pattern",
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
