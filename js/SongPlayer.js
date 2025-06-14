class SongPlayer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.songData = null;
    this.isPlaying = false;
    this.startTime = 0;
    this.loopStartBeat = 0;
    this.schedulerTimer = null;
    this.nextNoteTime = 0.0;
    this.scheduleAheadTime = 0.1;
    this.songDurationBeats = 0;
    this.onRender = null;
  }

  async loadSong(songData) {
    this.songData = songData;
    this.calculateSongDuration();
  }

  calculateSongDuration() {
    this.songDurationBeats = 0;
    if (!this.songData || !this.songData.arrangement) return;
    this.songData.arrangement.forEach((clip) => {
      const pattern = this.songData.patterns[clip.pattern];
      if (pattern) {
        const patternDuration =
          pattern.reduce(
            (max, note) => Math.max(max, note.time + note.duration),
            0
          ) || 4;
        const clipEndTime =
          clip.startTime + patternDuration * (clip.repeat || 1);
        if (clipEndTime > this.songDurationBeats)
          this.songDurationBeats = clipEndTime;
      }
    });
  }

  play() {
    if (this.isPlaying || !this.songData) return;
    if (this.audioEngine.audioContext.state === "suspended")
      this.audioEngine.audioContext.resume();

    this.isPlaying = true;
    this.startTime =
      this.audioEngine.audioContext.currentTime -
      (this.loopStartBeat * 60) / this.songData.bpm;
    this.nextNoteTime = this.loopStartBeat;

    requestAnimationFrame(this.renderLoop.bind(this));
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.schedulerTimer);
    this.audioEngine.stopAll();

    const currentTime =
      this.audioEngine.audioContext.currentTime - this.startTime;
    this.loopStartBeat = (currentTime * this.songData.bpm) / 60;
  }

  renderLoop() {
    if (!this.isPlaying) return;
    const songDurationSeconds =
      (this.songDurationBeats * 60) / this.songData.bpm;
    const currentTime =
      this.audioEngine.audioContext.currentTime - this.startTime;

    if (songDurationSeconds > 0 && currentTime >= songDurationSeconds) {
      this.seek(0, true);
      return;
    }
    if (this.onRender) this.onRender(currentTime);
    requestAnimationFrame(this.renderLoop.bind(this));
  }

  seek(timeInBeats, keepPlaying = false) {
    const wasPlaying = this.isPlaying || keepPlaying;
    if (this.isPlaying) this.stop();

    this.loopStartBeat = timeInBeats;

    const timeInSeconds = (timeInBeats * 60) / this.songData.bpm;
    if (this.onRender) this.onRender(timeInSeconds);

    if (wasPlaying) this.play();
  }

  scheduler() {
    if (!this.isPlaying) return;
    const loopDuration = 16;
    const lookaheadTime =
      this.scheduleAheadTime +
      (this.audioEngine.audioContext.currentTime - this.startTime);
    while (this.nextNoteTime < (lookaheadTime * this.songData.bpm) / 60) {
      this.scheduleNextLoop(this.nextNoteTime);
      this.nextNoteTime += loopDuration;
    }
    this.schedulerTimer = setTimeout(() => this.scheduler(), 25);
  }

  scheduleNextLoop(loopStartBeat) {
    const beatDuration = 60.0 / this.songData.bpm;
    const tracks = Object.fromEntries(
      this.songData.tracks.map((t) => [t.name, t])
    );
    for (const clip of this.songData.arrangement) {
      const track = tracks[clip.track];
      const pattern = this.songData.patterns[clip.pattern];
      if (!track || !pattern) continue;
      const patternDurationBeats = pattern.reduce(
        (max, note) => Math.max(max, note.time + note.duration),
        0
      );
      for (let i = 0; i < (clip.repeat || 1); i++) {
        const clipStartBeat = clip.startTime + i * patternDurationBeats;
        for (const note of pattern) {
          const noteStartBeat = clipStartBeat + note.time;
          if (noteStartBeat < loopStartBeat) continue;
          const scheduledTime = this.startTime + noteStartBeat * beatDuration;
          if (scheduledTime < this.audioEngine.audioContext.currentTime)
            continue;
          this.audioEngine.play(track.instrument, {
            wait: scheduledTime - this.audioEngine.audioContext.currentTime,
            pitch: note.pitch,
            duration: note.duration * beatDuration,
          });
        }
      }
    }
  }
}
