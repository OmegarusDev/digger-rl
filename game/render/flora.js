import { SpriteCache } from "../../forge/sprites.js";

const BASE = 56;
const sprites = new SpriteCache();

export function invalidateFlora() {
  sprites.clear();
}

function bakeTree(key, w, h, paint) {
  return sprites.get(key, w, h, paint);
}

export function drawFlora(ctx, cam, V, P, item, t) {
  const p = cam.project(item.x, item.y);
  if (p.y < -80 || p.y > cam.screenH + 80 || p.x < -80 || p.x > cam.screenW + 80) return;
  const scale = item.scale * p.s;

  if (item.state === "stump") {
    drawStump(ctx, P, p.x, p.y, scale);
    return;
  }

  const shake = item.shakeT > 0 ? Math.sin(t * 55) * 2.2 * item.shakeT * scale : 0;
  const fall = item.state === "falling" ? Math.min(1, 1 - item.fallT / 0.9) : 0;
  const fallEase = fall * fall;

  ctx.save();
  ctx.translate(p.x + shake, p.y);
  if (fall > 0) {
    ctx.rotate(fallEase * 1.45 * (item.variant % 2 === 0 ? 1 : -1));
    ctx.globalAlpha = fall > 0.85 ? (1 - fall) / 0.15 : 1;
  }

  if (item.kind === "tree") {
    drawTree(ctx, P, item, scale);
  } else if (item.kind === "rock") {
    drawRock(ctx, P, item, scale);
  } else if (item.kind === "bush" || item.kind === "berry") {
    drawBush(ctx, P, item, scale, item.kind === "berry");
  }
  ctx.restore();
}

function drawTree(ctx, P, item, scale) {
  const key = `tree:${item.species}:${item.variant}`;
  const w = BASE * 1.5;
  const h = BASE * 2.1;
  const spr = bakeTree(key, w, h, (g, gw, gh) => {
    const cx = gw / 2;
    const base = gh - 2;
    const trunkH = gh * 0.3;
    g.fillStyle = P.flora.trunkDark;
    g.fillRect(cx - 3, base - trunkH, 6, trunkH);
    g.fillStyle = P.flora.trunk;
    g.fillRect(cx - 3, base - trunkH, 3.4, trunkH);
    if (item.species === "pine") {
      const tint = item.variant === 0 ? P.flora.pineDark : item.variant === 1 ? P.flora.pineLight : "#456238";
      for (let i = 0; i < 3; i++) {
        const layerY = base - trunkH - i * gh * 0.21;
        const layerW = gw * (0.4 - i * 0.1);
        const layerH = gh * 0.32;
        g.fillStyle = i === 2 ? shadeHex(tint, 14) : tint;
        g.beginPath();
        g.moveTo(cx, layerY - layerH);
        g.lineTo(cx + layerW / 2, layerY);
        g.lineTo(cx - layerW / 2, layerY);
        g.closePath();
        g.fill();
      }
    } else {
      const tint = item.variant === 0 ? P.flora.oak : item.variant === 1 ? P.flora.oakLight : "#54713c";
      const canopyY = base - trunkH - gh * 0.12;
      const blobs = [
        [0, 0, 0.34],
        [-0.24, 0.08, 0.24],
        [0.24, 0.06, 0.25],
        [0.02, -0.22, 0.26],
      ];
      for (const [ox, oy, r] of blobs) {
        g.fillStyle = shadeHex(tint, ox < 0 ? -10 : 6);
        g.beginPath();
        g.arc(cx + ox * gw, canopyY + oy * gh, r * gw, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = shadeHex(tint, 24);
      g.beginPath();
      g.arc(cx - gw * 0.1, canopyY - gh * 0.18, gw * 0.16, 0, Math.PI * 2);
      g.fill();
    }
  });
  ctx.drawImage(
    spr,
    (-spr.width / 2) * scale,
    -(spr.height - 2) * scale,
    spr.width * scale,
    spr.height * scale
  );
}

function drawRock(ctx, P, item, scale) {
  const r = 0.34 * scale;
  ctx.fillStyle = P.flora.stoneDark;
  ctx.beginPath();
  ctx.ellipse(0, 0.02 * scale, r * 1.1, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.flora.stone;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-r * 0.55, -r * 1.15);
  ctx.lineTo(r * 0.3, -r * 0.95);
  ctx.lineTo(r, -r * 0.2);
  ctx.lineTo(r * 0.6, 0.05 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,250,230,0.16)";
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.95);
  ctx.lineTo(r * 0.25, -r * 0.8);
  ctx.lineTo(-r * 0.1, -r * 0.45);
  ctx.closePath();
  ctx.fill();
}

function drawBush(ctx, P, item, scale, berry) {
  const r = 0.3 * scale;
  ctx.fillStyle = shadeHex(P.flora.bush, -12);
  ctx.beginPath();
  ctx.arc(-r * 0.5, -r * 0.2, r * 0.8, 0, Math.PI * 2);
  ctx.arc(r * 0.55, -r * 0.15, r * 0.75, 0, Math.PI * 2);
  ctx.arc(0, -r * 0.55, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.flora.bush;
  ctx.beginPath();
  ctx.arc(0, -r * 0.5, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  if (berry) {
    ctx.fillStyle = P.flora.berry;
    for (const [ox, oy] of [[-0.4, -0.35], [0.3, -0.5], [0.1, -0.15], [-0.15, -0.6]]) {
      ctx.beginPath();
      ctx.arc(ox * r, oy * r, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStump(ctx, P, x, y, scale) {
  const r = 0.16 * scale;
  ctx.fillStyle = P.flora.trunkDark;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.flora.trunk;
  ctx.fillRect(x - r, y - r * 1.4, r * 2, r * 1.4);
  ctx.fillStyle = "#b09468";
  ctx.beginPath();
  ctx.ellipse(x, y - r * 1.4, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}
