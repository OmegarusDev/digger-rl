import { FONT } from "./draw.js";

export function hudPlate(ctx, x, y, w, h, accent = "rgba(216,162,74,0.55)") {
  ctx.fillStyle = "rgba(22,18,11,0.78)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const L = Math.min(9, w / 4, h / 4);
  ctx.lineWidth = 1.5;
  for (const [sx, sy] of [[1, 1], [w - 1, 1], [1, h - 1], [w - 1, h - 1]]) {
    const dx = sx === 1 ? 1 : -1;
    const dy = sy === 1 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x + sx, y + sy + dy * L);
    ctx.lineTo(x + sx, y + sy);
    ctx.lineTo(x + sx + dx * L, y + sy);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

export function plateHeader(ctx, px, py, pw, title, accent = "rgba(216,162,74,0.9)") {
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = accent;
  ctx.fillText(title, px + 10, py + 6);
  const w = ctx.measureText(title).width;
  ctx.strokeStyle = "rgba(216,162,74,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 10 + w + 8, py + 11);
  ctx.lineTo(px + pw - 10, py + 11);
  ctx.stroke();
}

export function hudBar(ctx, x, y, w, h, frac, col, opts = {}) {
  const shown = opts.shown ?? frac;
  ctx.fillStyle = "rgba(14,12,7,0.9)";
  ctx.fillRect(x, y, w, h);
  if (shown > 0) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, shown)), h);
  }
  ctx.strokeStyle = opts.border || "rgba(216,162,74,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  if (opts.flash > 0) {
    ctx.fillStyle = `rgba(255,248,220,${Math.min(0.55, opts.flash * 3)})`;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }
}

export function drawOffscreenMarker(ctx, cam, wx, wy, color, tag, pad = 56) {
  const s = cam.project(wx, wy);
  const mX = pad;
  const mTop = 64;
  const mBot = 56;
  if (s.x >= mX && s.x <= cam.screenW - mX && s.y >= mTop && s.y <= cam.screenH - mBot) return false;
  const cx = cam.screenW / 2;
  const cy = cam.screenH / 2;
  let dx = s.x - cx;
  let dy = s.y - cy;
  if (dx === 0 && dy === 0) dy = -1;
  const scale = Math.min(
    (cam.screenW / 2 - mX) / Math.abs(dx || 1e-6),
    (cam.screenH / 2 - mTop) / Math.abs(dy || 1e-6)
  );
  const scaleBot = (cam.screenH / 2 - mBot) / Math.abs(dy || 1e-6);
  const sc = dy > 0 ? Math.min(scale, scaleBot) : scale;
  const ax = cx + dx * sc;
  const ay = cy + dy * sc;
  const ang = Math.atan2(dy, dx);
  const pulse = 1 + Math.sin(performance.now() / 240) * 0.1;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -9);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-8, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (tag) {
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(tag, ax - Math.cos(ang) * 26, ay - Math.sin(ang) * 26);
  }
  return true;
}
