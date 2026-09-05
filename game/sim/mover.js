import { pathTo } from "./grid.js";
import { steerAlong } from "../../forge/paths.js";

export function makeMover(x, y, speed) {
  return {
    x,
    y,
    speed,
    dir: Math.PI / 2,
    phase: 0,
    moving: false,
    stuckT: 0,
    noProgress: 0,
    detour: null,
    cmd: { dx: 0, dy: 0 },
  };
}

export function isWalkableCell(state, cx, cy) {
  const n = state.size;
  if (cx < 0 || cy < 0 || cx >= n || cy >= n) return false;
  return state.walk[cy * n + cx] === 1;
}

export function tryMove(state, m, dx, dy) {
  const n = state.size;
  const nx = m.x + dx;
  const ny = m.y + dy;
  const walk = (cx, cy) => cx >= 0 && cy >= 0 && cx < n && cy < n && state.walk[cy * n + cx] === 1;
  if (walk(Math.floor(nx), Math.floor(ny))) {
    m.x = nx;
    m.y = ny;
  } else if (walk(Math.floor(nx), Math.floor(m.y))) {
    m.x = nx;
  } else if (walk(Math.floor(m.x), Math.floor(ny))) {
    m.y = ny;
  }
}

export function detourTarget(state, m, dirx, diry) {
  const cx = Math.floor(m.x);
  const cy = Math.floor(m.y);
  let best = null;
  let bestScore = 0.25;
  for (let r = 2; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cellx = cx + dx;
        const celly = cy + dy;
        if (!isWalkableCell(state, cellx, celly)) continue;
        const len = Math.hypot(dx, dy) || 1;
        const score = (dx / len) * dirx + (dy / len) * diry;
        if (score > bestScore) {
          bestScore = score;
          best = { x: cellx + 0.5, y: celly + 0.5 };
        }
      }
    }
  }
  return best;
}

export function walkCmd(state, m, dirx, diry, dt) {
  if (m.detour && dirx * m.detour.dx + diry * m.detour.dy < 0.5) m.detour = null;
  if (m.detour) {
    const bx = m.x;
    const by = m.y;
    const done = steerAlong(m, m.detour.path, m.speed, dt);
    m.phase += dt * m.speed * 0.62;
    m.moving = true;
    const stepped = Math.hypot(m.x - bx, m.y - by);
    if (done || stepped < m.speed * dt * 0.3) m.detour = null;
    return true;
  }
  const sp = m.speed * dt;
  const bx = m.x;
  const by = m.y;
  tryMove(state, m, dirx * sp, diry * sp);
  m.dir = Math.atan2(diry, dirx);
  m.phase += dt * m.speed * 0.62;
  m.moving = true;
  const stepped = Math.hypot(m.x - bx, m.y - by);
  if (stepped < sp * 0.35) {
    m.stuckT += dt;
    if (m.stuckT > 0.3) {
      m.stuckT = 0;
      const tgt = detourTarget(state, m, dirx, diry);
      if (tgt) {
        const p = pathTo(state, m.x, m.y, tgt.x, tgt.y);
        if (p && p.length > 1) m.detour = { path: p, wp: 0, dx: dirx, dy: diry };
      }
    }
  } else {
    m.stuckT = 0;
  }
  return false;
}

export function steerTo(state, m, tx, ty, dt, tol = 0.3) {
  const d = Math.hypot(tx - m.x, ty - m.y);
  if (d <= tol) {
    m.moving = false;
    m.noProgress = 0;
    return true;
  }
  const dirx = (tx - m.x) / d;
  const diry = (ty - m.y) / d;
  if (m.detour && dirx * m.detour.dx + diry * m.detour.dy < 0.5) m.detour = null;
  if (m.detour) {
    const bx = m.x;
    const by = m.y;
    const done = steerAlong(m, m.detour.path, m.speed, dt);
    m.phase += dt * m.speed * 0.62;
    m.moving = true;
    const stepped = Math.hypot(m.x - bx, m.y - by);
    if (stepped >= m.speed * dt * 0.3) m.noProgress = 0;
    else m.noProgress += dt;
    if (done || stepped < m.speed * dt * 0.3) m.detour = null;
    return false;
  }
  const sp = m.speed * dt;
  const bx = m.x;
  const by = m.y;
  tryMove(state, m, dirx * sp, diry * sp);
  m.dir = Math.atan2(diry, dirx);
  m.phase += dt * m.speed * 0.62;
  m.moving = true;
  const stepped = Math.hypot(m.x - bx, m.y - by);
  if (stepped < sp * 0.35) {
    m.noProgress += dt;
    m.stuckT += dt;
    if (m.stuckT > 0.3) {
      m.stuckT = 0;
      const tgt = detourTarget(state, m, dirx, diry);
      if (tgt) {
        const p = pathTo(state, m.x, m.y, tgt.x, tgt.y);
        if (p && p.length > 1) m.detour = { path: p, wp: 0, dx: dirx, dy: diry };
      }
    }
  } else {
    m.noProgress = 0;
    m.stuckT = 0;
  }
  return d <= tol + m.speed * dt;
}
