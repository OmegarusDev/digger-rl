const N8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function isWalkable(state, cx, cy) {
  const n = state.size;
  if (cx < 0 || cy < 0 || cx >= n || cy >= n) return false;
  return state.walk[cy * n + cx] === 1;
}

class Heap {
  constructor() {
    this.a = [];
  }
  get size() {
    return this.a.length;
  }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export function astar(state, sx, sy, tx, ty) {
  const n = state.size;
  if (!isWalkable(state, tx, ty)) return null;
  const startK = sy * n + sx;
  const goalK = ty * n + tx;
  if (startK === goalK) return [];
  const open = new Heap();
  const gScore = new Map();
  const cameFrom = new Map();
  const h = (x, y) => Math.max(Math.abs(x - tx), Math.abs(y - ty));
  gScore.set(startK, 0);
  open.push({ k: startK, x: sx, y: sy, f: h(sx, sy) });
  const closed = new Set();
  while (open.size > 0) {
    const cur = open.pop();
    if (cur.k === goalK) {
      const path = [];
      let k = goalK;
      while (k !== startK) {
        path.push({ x: (k % n) + 0.5, y: Math.floor(k / n) + 0.5 });
        k = cameFrom.get(k);
      }
      path.reverse();
      return path;
    }
    if (closed.has(cur.k)) continue;
    closed.add(cur.k);
    for (const [dx, dy] of N8) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!isWalkable(state, nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!isWalkable(state, cur.x + dx, cur.y) || !isWalkable(state, cur.x, cur.y + dy))) continue;
      const nk = ny * n + nx;
      if (closed.has(nk)) continue;
      const step = dx !== 0 && dy !== 0 ? 1.414 : 1;
      const g = gScore.get(cur.k) + step;
      if (g < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, g);
        cameFrom.set(nk, cur.k);
        open.push({ k: nk, x: nx, y: ny, f: g + h(nx, ny) });
      }
    }
  }
  return null;
}

export function nearestWalkable(state, wx, wy, maxR = 6) {
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  if (isWalkable(state, cx, cy)) return { x: cx, y: cy };
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isWalkable(state, cx + dx, cy + dy)) return { x: cx + dx, y: cy + dy };
      }
    }
  }
  return null;
}

export function pathTo(state, fromWx, fromWy, toWx, toWy) {
  const s = nearestWalkable(state, fromWx, fromWy);
  const t = nearestWalkable(state, toWx, toWy);
  if (!s || !t) return null;
  const path = astar(state, s.x, s.y, t.x, t.y);
  if (path === null) return null;
  const pts = [{ x: fromWx, y: fromWy }, ...path];
  if (pts.length > 2) {
    const last = pts[pts.length - 1];
    if (Math.hypot(last.x - toWx, last.y - toWy) < 1.2) pts.push({ x: toWx, y: toWy });
  }
  return pts;
}
