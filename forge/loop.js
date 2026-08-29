export class GameLoop {
  constructor({ update, render, hz = 30, maxSteps = 6 }) {
    this.update = update;
    this.render = render;
    this.step = 1 / hz;
    this.maxSteps = maxSteps;
    this.speed = 1;
    this.paused = false;
    this.accum = 0;
    this._raf = 0;
    this._last = 0;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this._last) / 1000);
      this._last = now;
      this.advance(dt);
      this._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  advance(dt) {
    if (!this.paused && this.speed > 0) {
      this.accum += dt * this.speed;
      let guard = 0;
      while (this.accum >= this.step && guard++ < this.maxSteps) {
        this.accum -= this.step;
        this.update(this.step);
      }
      if (this.accum > 0.25) this.accum = 0;
    }
    this.render(dt);
  }
}
