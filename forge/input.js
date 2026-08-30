export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseInside = false;
    this.dragging = false;
    this._dragStart = null;
    this._pendingClick = null;
    this._zoomDelta = 0;
    this._oneshots = new Set();

    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this._oneshots.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.dragging = true;
      this._dragStart = { x: e.clientX, y: e.clientY, moved: false, button: e.button };
    });
    canvas.addEventListener("pointermove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseInside = true;
      if (this.dragging && this._dragStart) {
        const dx = e.clientX - this._dragStart.x;
        const dy = e.clientY - this._dragStart.y;
        if (Math.hypot(dx, dy) > 5) this._dragStart.moved = true;
        this._dragDx = (this._dragDx || 0) + (e.clientX - (this._prevX ?? e.clientX));
        this._dragDy = (this._dragDy || 0) + (e.clientY - (this._prevY ?? e.clientY));
      }
      this._prevX = e.clientX;
      this._prevY = e.clientY;
    });
    canvas.addEventListener("pointerup", (e) => {
      canvas.releasePointerCapture?.(e.pointerId);
      if (this.dragging && this._dragStart && !this._dragStart.moved) {
        this._pendingClick = { x: e.clientX, y: e.clientY, button: this._dragStart.button };
      }
      this.dragging = false;
      this._dragStart = null;
      this._prevX = null;
    });
    canvas.addEventListener("pointerleave", () => {
      this.mouseInside = false;
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this._zoomDelta += e.deltaY;
        this._zoomX = e.clientX;
        this._zoomY = e.clientY;
      },
      { passive: false }
    );
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this._oneshots.add("RightClick");
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consumeOneShots() {
    const o = [...this._oneshots];
    this._oneshots.clear();
    const click = this._pendingClick;
    this._pendingClick = null;
    const zoom = { delta: this._zoomDelta, x: this._zoomX ?? this.mouseX, y: this._zoomY ?? this.mouseY };
    this._zoomDelta = 0;
    const drag = { dx: this._dragDx || 0, dy: this._dragDy || 0, moved: !!this._dragStart?.moved };
    this._dragDx = 0;
    this._dragDy = 0;
    return { keys: o, click, zoom, drag };
  }
}
