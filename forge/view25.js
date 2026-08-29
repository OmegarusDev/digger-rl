export function makeView25({ pitchDeg = 24, trap = 0.42 } = {}) {
  const V = {
    pitchDeg,
    trap,
    yScale: 0.79,
    deckRatio: 0.79,
    farScale: 0.62,
    nearScale: 1,
    shadowSkew: 0.02,
    boxSkew: 0.14,
    rise: 0.24,
    vExag: 1.09,
    depthFog: 0.22,
    setPitch(deg) {
      V.pitchDeg = Math.max(8, Math.min(58, deg));
      _sync();
    },
    deckRy(rx) {
      return rx * V.deckRatio;
    },
    groundBasis(angle) {
      const D = V.yScale;
      const ax = Math.cos(angle);
      const ay = Math.sin(angle) * D;
      const pl = Math.hypot(Math.sin(angle), D * Math.cos(angle)) || 1;
      return {
        D,
        V: V.vExag,
        ax,
        ay,
        px: -Math.sin(angle) / pl,
        py: (D * Math.cos(angle)) / pl,
        len: Math.hypot(ax, ay),
        depth: Math.max(0, Math.min(1, -Math.sin(angle))),
      };
    },
    capEllipse(basis, r) {
      const a = basis.px * basis.px;
      const c = basis.px * basis.py * basis.D;
      const b = basis.py * basis.py * basis.D * basis.D + basis.V * basis.V;
      const tr = a + b;
      const disc = Math.sqrt(Math.max(0, (a - b) * (a - b) + 4 * c * c));
      const l1 = (tr + disc) / 2;
      const l2 = Math.max(1e-6, (tr - disc) / 2);
      return {
        rx: r * Math.sqrt(l1),
        ry: r * Math.sqrt(l2),
        rot: 0.5 * Math.atan2(2 * c, a - b),
      };
    },
  };

  function _sync() {
    const p = (V.pitchDeg * Math.PI) / 180;
    const cos = Math.cos(p);
    const sin = Math.sin(p);
    const D = Math.max(0.42, Math.pow(cos, 1.5));
    V.yScale = D;
    V.deckRatio = D;
    V.farScale = Math.max(0.35, 1 - sin * V.trap);
    V.nearScale = 1;
    V.vExag = 0.72 + 0.92 * sin;
    V.rise = 0.13 + 0.28 * sin;
    V.boxSkew = 0.1 + 0.14 * sin;
    V.shadowSkew = 0.012 + 0.05 * sin;
    V.depthFog = 0.12 + 0.38 * sin;
  }

  _sync();
  return V;
}
