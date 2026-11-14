// Drives one or more videotron iframes (opened with ?ext=1) from the parent page,
// so the page can offer play / pause / restart / seek like a real video player.
class SpotPlayer {
  constructor(frames, { length = 20, autoplay = true, loop = true, onTick } = {}) {
    this.frames = frames; this.L = length; this.loop = loop; this.onTick = onTick;
    this.t = 0; this.playing = autoplay; this.last = performance.now();
    const step = (now) => {
      const dt = (now - this.last) / 1000; this.last = now;
      if (this.playing) {
        this.t += dt;
        if (this.t >= this.L) { this.t = this.loop ? this.t % this.L : this.L; if (!this.loop) this.playing = false; }
      }
      this.frames.forEach((f) => f.contentWindow && f.contentWindow.postMessage({ t: this.t }, '*'));
      this.onTick && this.onTick(this.t, this.playing);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  play() { this.playing = true; } pause() { this.playing = false; }
  toggle() { this.playing = !this.playing; }
  restart() { this.t = 0; this.playing = true; }
  seek(t) { this.t = Math.max(0, Math.min(this.L, t)); }
}
const fmtTime = (t) => `0:${String(Math.floor(t)).padStart(2, '0')}`;
