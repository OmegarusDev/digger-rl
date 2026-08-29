export function chaikin(pts, iterations = 2, closed = false) {
  let out = pts;
  for (let it = 0; it < iterations; it++) {
    const next = [];
    const n = out.length;
    if (n < 3) return out;
    if (!closed) next.push(out[0]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = out[i];
      const b = out[(i + 1) % n];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    if (!closed) next.push(out[n - 1]);
    out = next;
  }
  return out;
}

export function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

export function pointAlong(pts, dist) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (acc + seg >= dist) {
      const t = seg > 0 ? (dist - acc) / seg : 0;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
      };
    }
    acc += seg;
  }
  return { ...pts[pts.length - 1] };
}

export function steerAlong(agent, pts, speed, dt) {
  let budget = speed * dt;
  while (agent.wp < pts.length) {
    const target = pts[agent.wp];
    const dx = target.x - agent.x;
    const dy = target.y - agent.y;
    const d = Math.hypot(dx, dy);
    if (d <= budget || d < 0.02) {
      agent.x = target.x;
      agent.y = target.y;
      budget -= d;
      agent.wp++;
      if (agent.wp >= pts.length) return true;
      if (budget <= 1e-9) return false;
      continue;
    }
    agent.x += (dx / d) * budget;
    agent.y += (dy / d) * budget;
    agent.dir = Math.atan2(dy, dx);
    return false;
  }
  return true;
}

const STYLES = {
  paved: { fill: "#9a8a68", edge: "#6f6044", shoulder: 5, center: "rgba(210,190,150,0.28)" },
  dirt: { fill: "#a8946a", edge: "#77664a", shoulder: 4, center: null },
  track: { fill: "#b3a077", edge: "#8a7a56", shoulder: 3, center: null },
};

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

export function drawPath(ctx, cam, pts, surface = "dirt", width = 14) {
  if (!pts || pts.length < 2) return;
  const st = STYLES[surface] || STYLES.dirt;
  const trace = () => {
    ctx.beginPath();
    let first = true;
    for (const p of pts) {
      const s = cam.project(p.x, p.y);
      if (first) {
        ctx.moveTo(s.x, s.y);
        first = false;
      } else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = st.edge;
  ctx.lineWidth = width + st.shoulder;
  trace();
  ctx.strokeStyle = st.fill;
  ctx.lineWidth = width;
  trace();
  if (st.center) {
    ctx.strokeStyle = st.center;
    ctx.lineWidth = Math.max(1, width * 0.12);
    ctx.setLineDash([12, 18]);
    trace();
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = width * 0.45;
    ctx.setLineDash([4, 10]);
    trace();
    ctx.setLineDash([]);
  }
}
