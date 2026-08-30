import { cyl25, box25, frustum25, diamondPrism25 } from "./prims.js";

function col(C, k) {
  if (!k) return "#888";
  if (k[0] === "#") return k;
  return (C && C[k]) || k;
}

function blobRy(V, rx) {
  return rx * (0.55 + 0.45 * V.deckRatio);
}

function vpz(V, s, k) {
  return k * s * V.vExag;
}

export function drawVisual(ctx, V, def, x, y, s, C) {
  for (const [prim, e] of def) {
    const ox = (e.x || 0) * s;
    const lift = vpz(V, s, e.y || 0);
    switch (prim) {
      case "shadow": {
        const rx = e.r * s;
        ctx.fillStyle = `rgba(14,16,8,${e.a ?? 0.2})`;
        ctx.beginPath();
        ctx.ellipse(x + rx * V.shadowSkew * 2, y, rx, V.deckRy(rx), 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "cyl": {
        const h = vpz(V, s, e.h ?? 0.2);
        cyl25(V, ctx, x + ox, y - lift - h, (e.r ?? 0.1) * s, h, col(C, e.top), col(C, e.side), col(C, e.bottom));
        break;
      }
      case "box": {
        const h = vpz(V, s, e.h ?? 0.3);
        box25(V, ctx, x + ox, y - lift - h, (e.w ?? 0.5) * s, (e.d ?? 0.4) * s, h, {
          top: col(C, e.top),
          side: col(C, e.side),
          sideDark: col(C, e.dark),
        });
        break;
      }
      case "frustum": {
        const h = vpz(V, s, e.h ?? 0.3);
        frustum25(V, ctx, x + ox, y - lift - h, (e.rxBot ?? 0.5) * s, (e.rxTop ?? 0.2) * s, h, {
          top: col(C, e.top),
          side: col(C, e.side),
          sideDark: col(C, e.dark),
        });
        break;
      }
      case "diamond": {
        const h = vpz(V, s, e.h ?? 0.24);
        diamondPrism25(V, ctx, x + ox, y - lift - h, (e.r ?? 0.3) * s, h, {
          top: col(C, e.top),
          side: col(C, e.side),
          sideDark: col(C, e.dark),
        });
        break;
      }
      case "blob": {
        const rx = (e.r ?? 0.2) * s;
        const ry = blobRy(V, rx) * (e.ry ?? 1);
        ctx.fillStyle = col(C, e.c);
        ctx.beginPath();
        ctx.ellipse(x + ox, y - lift - ry, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "cone": {
        const w = (e.w ?? 0.5) * s;
        const h = vpz(V, s, e.h ?? 0.35);
        const by = y - lift;
        ctx.fillStyle = col(C, e.c);
        ctx.beginPath();
        ctx.moveTo(x + ox, by - h);
        ctx.lineTo(x + ox + w / 2, by);
        ctx.lineTo(x + ox - w / 2, by);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "roof": {
        const w = (e.w ?? 0.9) * s;
        const d = (e.d ?? 0.72) * s;
        const base = y - lift;
        const peak = vpz(V, s, e.h ?? 0.32);
        const hw = w / 2;
        const skew = d * V.boxSkew;
        const tl = { x: x - hw + skew * 0.2, y: base - d * 0.35 };
        const tr = { x: x + hw + skew * 0.2, y: base - d * 0.35 };
        const br = { x: x + hw - skew * 0.15, y: base + d * 0.55 };
        const bl = { x: x - hw - skew * 0.15, y: base + d * 0.55 };
        const R1 = { x: x - hw * 0.96, y: (tl.y + bl.y) / 2 - peak };
        const R2 = { x: x + hw * 0.96, y: (tr.y + br.y) / 2 - peak };
        const poly = (pts, color) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.fill();
        };
        poly([tl, tr, R2, R1], col(C, e.top));
        poly([tl, bl, R1], col(C, e.gable));
        poly([tr, br, R2], col(C, e.gable));
        poly([bl, br, R2, R1], col(C, e.c));
        ctx.strokeStyle = "rgba(255,248,224,0.28)";
        ctx.lineWidth = Math.max(1, 0.02 * s);
        ctx.beginPath();
        ctx.moveTo(R1.x, R1.y);
        ctx.lineTo(R2.x, R2.y);
        ctx.stroke();
        ctx.lineWidth = 1;
        break;
      }
      case "dots": {
        const r = (e.r ?? 0.16) * s;
        ctx.fillStyle = col(C, e.c);
        for (const [dx, dy] of e.pts) {
          ctx.beginPath();
          ctx.arc(x + ox + dx * r, y - lift + dy * r * 0.6, Math.max(1, 0.04 * s), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "post": {
        const h = vpz(V, s, e.h ?? 0.2);
        ctx.fillStyle = col(C, e.side);
        ctx.fillRect(x + ox - 0.03 * s, y - lift - h, 0.06 * s, h);
        ctx.fillStyle = col(C, e.top);
        ctx.fillRect(x + ox - 0.03 * s, y - lift - h, 0.06 * s, 0.02 * s);
        break;
      }
      default:
        break;
    }
  }
}
