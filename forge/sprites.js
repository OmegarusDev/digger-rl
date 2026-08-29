export class SpriteCache {
  constructor() {
    this.map = new Map();
  }

  get(key, w, h, draw) {
    let s = this.map.get(key);
    if (!s) {
      s = document.createElement("canvas");
      s.width = Math.max(1, Math.ceil(w));
      s.height = Math.max(1, Math.ceil(h));
      draw(s.getContext("2d"), s.width, s.height);
      this.map.set(key, s);
    }
    return s;
  }

  invalidate(prefix) {
    for (const k of [...this.map.keys()]) {
      if (k.startsWith(prefix)) this.map.delete(k);
    }
  }

  clear() {
    this.map.clear();
  }
}
