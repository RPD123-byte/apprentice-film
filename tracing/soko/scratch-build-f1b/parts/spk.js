function speakerL(g) {
  // books on top
  book(g, [[553, 447], [648, 445], [650, 461], [554, 462]], { seed: 1001, k: 0.75 });
  book(g, [[532, 461], [655, 459], [657, 476], [533, 477]], { seed: 1003, k: 0.8 });
  book(g, [[537, 476], [664, 475], [666, 490], [538, 491]], { seed: 1005, k: 0.75 });
  book(g, [[527, 490], [668, 489], [669, 503], [528, 504]], { seed: 1007, lum: 0.9, k: 0.7 });
  // cabinet: dark wooden front, a lit side with vertical grain, a thin lit top
  brush(g, [[521, 505], [633, 505], [633, 704], [521, 704]], (v) => { v.fillStyle = lg(v, 521, 0, 633, 0, [[0, 0.2], [0.5, 0.16], [1, 0.12]]); v.fillRect(520, 504, 115, 202); }, PI / 2,
    { len: 26, w: 2.2, gap: 2, seed: 1010, jit: 0.06, base: 0.6 });
  face(g, [[633, 505], [700, 511], [700, 628], [633, 628]], [0.62, 0.6, 0.5, 0.58], "v", { per: 4, seed: 1011, brk: 0.3 });
  stripes(g, [[521, 499], [633, 499], [700, 505], [633, 505]], { dir: "h", per: 2.6, cov: 0.7, lum: 0.9, seed: 1014 });
  ink(g, [[633, 505], [633, 704]], 1.5, BLK, { seed: 1012 });
  ink(g, [[521, 505], [633, 505], [700, 511]], 1.4, grey(0.75), { seed: 1013 });
  ink(g, [[521, 505], [521, 704]], 1.2, grey(0.35), { seed: 1015 });
  driver(g, 577, 540, 15, "tweeter");
  driver(g, 577, 613, 45, "woofer");
  // the tall rack unit beside it
  face(g, [[678, 447], [710, 447], [712, 515], [680, 515]], [0.45, 0.3, 0.3, 0.4], "v", { per: 3.4, seed: 1020 });
  ink(g, [[678, 447], [710, 447], [712, 515], [680, 515]], 1.4, BLK, { closed: true, seed: 1021 });
  for (const y of [470, 490]) { dot(g, 693, y, 4, "#0a0a0a"); ring(g, 693, y, 4.2, 1.2, grey(0.7)); }
}
function driver(g, cx, cy, r, kind) {
  if (kind === "woofer") {
    dot(g, cx, cy, r, grey(0.05));
    ring(g, cx, cy, r - 1.5, 2, grey(0.35));
    ring(g, cx, cy, r * 0.82, 3, grey(0.12));
    // the cone: pale, lit from the upper left, with fine radial streaks
    soft(g, E(cx, cy, r * 0.74, r * 0.74, 0), rg(g, cx - r * 0.2, cy - r * 0.25, r * 0.1, r * 0.8, [[0, 0.9], [0.55, 0.78], [1, 0.4]]));
    g.save(); g.beginPath(); g.arc(cx, cy, r * 0.74, 0, PI * 2); g.clip();
    const rr = rng(Math.round(cx * 7 + cy));
    for (let i = 0; i < 70; i++) { const a = rr() * PI * 2, l0 = r * (0.3 + rr() * 0.15), l1 = r * (0.55 + rr() * 0.2); ink(g, [[cx + Math.cos(a) * l0, cy + Math.sin(a) * l0], [cx + Math.cos(a) * l1, cy + Math.sin(a) * l1]], 1, grey(rr() < 0.5 ? 0.3 : 0.95, 0.35), { seed: 3000 + i }); }
    g.restore();
    dot(g, cx, cy, r * 0.3, grey(0.05));
    soft(g, E(cx - r * 0.08, cy - r * 0.1, r * 0.12, r * 0.09, 0), grey(0.35));
    ring(g, cx, cy, r * 0.74, 1.2, grey(0.25));
  } else {
    dot(g, cx, cy, r, grey(0.05));
    ring(g, cx, cy, r - 1, 1.4, grey(0.3));
    soft(g, E(cx, cy, r * 0.62, r * 0.62, 0), rg(g, cx - r * 0.25, cy - r * 0.25, 1, r * 0.7, [[0, 0.4], [1, 0.08]]));
    dot(g, cx - r * 0.12, cy - r * 0.15, r * 0.14, grey(0.9));
  }
}
