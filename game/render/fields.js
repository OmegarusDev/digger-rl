import { CROPS, STAGE_LABELS } from "../data/crops.js";

export function drawField(ctx, cam, P, field, t) {
  for (const tile of field.tiles) {
    const p = cam.project(tile.x + 0.5, tile.y + 0.5);
    if (p.y < -60 || p.y > cam.screenH + 60 || p.x < -60 || p.x > cam.screenW + 60) continue;
    const s = cam.scale * p.s;
    const w = 0.46 * s;
    const h = 0.46 * s * cam.V.deckRatio;
    const odd = (tile.x + tile.y) % 2 === 0;
    ctx.fillStyle = odd ? "#4a3826" : "#44331f";
    ctx.fillRect(p.x - w, p.y - h, w * 2, h * 2);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(p.x - w, p.y + h - 2, w * 2, 2);
    drawCrop(ctx, p, s, field, t);
  }
}

function drawCrop(ctx, p, s, field, t) {
  if (!field.seed || field.stage < 0) return;
  const ripe = field.stage === 3;
  const growth = field.stage === 1 ? 0.35 : field.stage === 2 ? 0.7 : 1;
  const stalkH = 0.1 * s * growth + 0.02 * s;
  ctx.strokeStyle = ripe ? "#c8a03c" : "#6f8c4c";
  ctx.lineWidth = Math.max(1, 0.014 * s);
  for (let i = 0; i < 4; i++) {
    const ox = (i - 1.5) * 0.16 * s;
    const sway = Math.sin(t * 1.7 + i * 1.3 + p.x * 0.05) * 0.02 * s * growth;
    ctx.beginPath();
    ctx.moveTo(p.x + ox, p.y);
    ctx.lineTo(p.x + ox + sway, p.y - stalkH);
    ctx.stroke();
    if (ripe) {
      ctx.fillStyle = "#d8b24a";
      ctx.fillRect(p.x + ox + sway - 1, p.y - stalkH - 2, 2, 3);
    }
  }
}

export function drawFieldGhost(ctx, cam, tiles, valid) {
  for (const tile of tiles) {
    const p = cam.project(tile.x + 0.5, tile.y + 0.5);
    const s = cam.scale * p.s;
    const w = 0.46 * s;
    const h = 0.46 * s * cam.V.deckRatio;
    ctx.fillStyle = valid ? "rgba(123,160,92,0.28)" : "rgba(196,90,74,0.3)";
    ctx.fillRect(p.x - w, p.y - h, w * 2, h * 2);
    ctx.strokeStyle = valid ? "rgba(123,160,92,0.9)" : "rgba(196,90,74,0.9)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(p.x - w, p.y - h, w * 2, h * 2);
  }
}
