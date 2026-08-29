export function drawAgent(ctx, p, a, skin, V, unit) {
  const s = p.s;
  const u = unit * s;
  const x = p.x;
  const groundY = p.y;
  const H = 0.52 * u;
  const bob = a.moving ? Math.sin(a.phase * Math.PI * 2) * 0.035 * u : 0;
  const face = Math.cos(a.dir) < 0 ? -1 : 1;
  const legSwing = a.moving ? Math.sin(a.phase * Math.PI * 2) * 0.09 * u : 0;

  ctx.fillStyle = "rgba(16,14,8,0.3)";
  ctx.beginPath();
  ctx.ellipse(x + u * 0.02, groundY, 0.13 * u, 0.13 * u * V.deckRatio, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, groundY + bob);
  ctx.scale(face, 1);

  const hipY = -0.2 * u;
  ctx.strokeStyle = skin.pants || "#4a3a28";
  ctx.lineWidth = 0.05 * u;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-0.045 * u, hipY);
  ctx.lineTo(-0.045 * u - legSwing, 0);
  ctx.moveTo(0.045 * u, hipY);
  ctx.lineTo(0.045 * u + legSwing, 0);
  ctx.stroke();

  ctx.fillStyle = a.flash > 0 ? "#ffffff" : skin.tunic;
  ctx.beginPath();
  ctx.moveTo(-0.09 * u, hipY);
  ctx.lineTo(0.09 * u, hipY);
  ctx.lineTo(0.075 * u, hipY - 0.17 * u);
  ctx.lineTo(-0.075 * u, hipY - 0.17 * u);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = skin.outline;
  ctx.lineWidth = 0.012 * u;
  ctx.stroke();

  const shoulderY = hipY - 0.17 * u;
  const headR = 0.062 * u;
  const headY = shoulderY - headR * 0.9;

  ctx.strokeStyle = skin.skin;
  ctx.lineWidth = 0.045 * u;
  const armSwing = a.moving ? Math.sin(a.phase * Math.PI * 2 + Math.PI) * 0.07 * u : 0;
  ctx.beginPath();
  ctx.moveTo(-0.06 * u, shoulderY + 0.02 * u);
  ctx.lineTo(-0.075 * u - armSwing, shoulderY + 0.13 * u);
  ctx.stroke();

  if (a.carry > 0) {
    ctx.save();
    ctx.translate(0.05 * u, shoulderY - 0.06 * u);
    ctx.rotate(-0.5);
    ctx.fillStyle = skin.log;
    ctx.fillRect(-0.02 * u, -0.055 * u, 0.2 * u, 0.045 * u);
    ctx.fillRect(-0.02 * u, 0.0, 0.2 * u, 0.045 * u);
    ctx.fillStyle = "#a88a5a";
    ctx.fillRect(0.17 * u, -0.055 * u, 0.012 * u, 0.1 * u);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0.06 * u, shoulderY + 0.02 * u);
    ctx.lineTo(0.02 * u, shoulderY + 0.13 * u);
    ctx.stroke();
  } else if (a.action === "chop" || a.action === "mine") {
    const swing = Math.sin(Math.min(1, a.swing) * Math.PI);
    const ang = -0.9 + swing * 1.7;
    ctx.save();
    ctx.translate(0.06 * u, shoulderY + 0.03 * u);
    ctx.rotate(ang);
    ctx.strokeStyle = skin.tool;
    ctx.lineWidth = 0.03 * u;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0.22 * u, 0);
    ctx.stroke();
    ctx.fillStyle = skin.toolDark;
    ctx.fillRect(0.2 * u, -0.035 * u, 0.05 * u, a.action === "mine" ? 0.07 * u : 0.045 * u);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0.06 * u, shoulderY + 0.02 * u);
    ctx.lineTo(0.1 * u, shoulderY + 0.1 * u);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0.06 * u, shoulderY + 0.02 * u);
    ctx.lineTo(0.075 * u + armSwing, shoulderY + 0.13 * u);
    ctx.stroke();
  }

  ctx.fillStyle = skin.skin;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin.hair;
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.15, headR, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  if (skin.hood) {
    ctx.fillStyle = skin.tunic;
    ctx.beginPath();
    ctx.arc(0, headY - headR * 0.2, headR * 1.12, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-headR * 1.05, headY - headR * 0.1);
    ctx.lineTo(-headR * 1.3, headY + headR * 0.9);
    ctx.lineTo(-headR * 0.5, headY + headR * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  if (skin.trim) {
    ctx.fillStyle = skin.trim;
    ctx.fillRect(-0.075 * u, hipY - 0.17 * u, 0.15 * u, 0.02 * u);
  }
  ctx.restore();
}
