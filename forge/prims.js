export function vz(V, s, k) {
  return s * k * V.vExag;
}

export function cyl25(V, ctx, cx, topY, rx, rise, topCol, sideCol, bottomCol, opts = {}) {
  const ry = V.deckRy(rx);
  const bottomY = topY + rise;
  const rimCol = bottomCol || shadeLocal(sideCol, -0.15);
  ctx.fillStyle = sideCol;
  ctx.fillRect(cx - rx, topY, rx * 2, Math.max(1, rise));
  ctx.beginPath();
  ctx.ellipse(cx, bottomY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rimCol;
  ctx.beginPath();
  ctx.ellipse(cx, bottomY, rx, ry, 0, 0.15, Math.PI - 0.15);
  ctx.fill();
  if (opts.roundedBottom === true) {
    ctx.fillStyle = sideCol;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, rx, ry, 0, Math.PI, 0, true);
    ctx.fill();
  }
  ctx.fillStyle = topCol;
  ctx.beginPath();
  ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,248,224,0.18)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.12, topY - ry * 0.08, rx * 0.72, ry * 0.55, -0.35, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

export function box25(V, ctx, cx, topY, w, d, h, m) {
  const hw = w / 2;
  const hd = d / 2;
  const skew = d * V.boxSkew;
  const tl = { x: cx - hw + skew * 0.2, y: topY - hd * 0.35 };
  const tr = { x: cx + hw + skew * 0.2, y: topY - hd * 0.35 };
  const br = { x: cx + hw - skew * 0.15, y: topY + hd * 0.55 };
  const bl = { x: cx - hw - skew * 0.15, y: topY + hd * 0.55 };
  ctx.fillStyle = m.sideDark;
  ctx.beginPath();
  ctx.moveTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(br.x, br.y + h);
  ctx.lineTo(tr.x, tr.y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = m.side;
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(br.x, br.y + h);
  ctx.lineTo(bl.x, bl.y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = m.top;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.stroke();
}

export function frustum25(V, ctx, cx, topY, rxBot, rxTop, rise, m) {
  const ryBot = V.deckRy(rxBot);
  const ryTop = V.deckRy(rxTop);
  ctx.fillStyle = m.side;
  ctx.beginPath();
  ctx.moveTo(cx - rxTop, topY);
  ctx.lineTo(cx - rxBot, topY + rise);
  ctx.lineTo(cx + rxBot, topY + rise);
  ctx.lineTo(cx + rxTop, topY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = m.sideDark;
  ctx.beginPath();
  ctx.ellipse(cx, topY + rise, rxBot, ryBot, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = m.top;
  ctx.beginPath();
  ctx.ellipse(cx, topY, rxTop, ryTop, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,248,224,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx - rxTop * 0.1, topY - ryTop * 0.08, rxTop * 0.65, ryTop * 0.5, -0.3, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

export function diamondPrism25(V, ctx, cx, topY, rx, rise, m) {
  const ry = V.deckRy(rx);
  const top = [
    { x: cx, y: topY - ry },
    { x: cx + rx, y: topY },
    { x: cx, y: topY + ry },
    { x: cx - rx, y: topY },
  ];
  const bot = top.map((p) => ({ x: p.x, y: p.y + rise }));
  ctx.fillStyle = m.sideDark;
  facePolyLocal(ctx, [top[1], top[2], bot[2], bot[1]]);
  ctx.fillStyle = m.side;
  facePolyLocal(ctx, [top[2], top[3], bot[3], bot[2]]);
  ctx.fillStyle = m.top;
  facePolyLocal(ctx, top);
  ctx.strokeStyle = "rgba(255,248,224,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(top[3].x, top[3].y);
  ctx.lineTo(top[0].x, top[0].y);
  ctx.lineTo(top[1].x, top[1].y);
  ctx.stroke();
}

export function ring25(V, ctx, cx, y, rx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.ellipse(cx, y, rx, V.deckRy(rx), 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function rivetRing(V, ctx, cx, y, rx, count, color) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const px = cx + Math.cos(a) * rx;
    const py = y + Math.sin(a) * V.deckRy(rx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.9, rx * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function groundShadow(V, ctx, cx, cy, rx, alpha = 0.32) {
  const ry = V.deckRy(rx);
  ctx.fillStyle = `rgba(10,12,8,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx + rx * V.shadowSkew * 1.4, cy + ry * 0.25, rx * 1.12, ry * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(10,12,8,${alpha * 0.7})`;
  ctx.beginPath();
  ctx.ellipse(cx + rx * V.shadowSkew, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function facePolyLocal(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function shadeLocal(hex, amount) {
  if (!hex || hex[0] !== "#" || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(255 * amount)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(255 * amount)));
  const b = Math.max(0, Math.min(255, (n & 255) + Math.round(255 * amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
