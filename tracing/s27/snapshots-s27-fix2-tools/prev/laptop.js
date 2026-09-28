// s27 (drawn) — the laptop, drawn in code.
//   Lid: drawn in PAGE coordinates (the 2206x946 colour page; the measured SCREEN homography maps page -> frame), so
//        the shell, bezel and black display ride exactly with the page. Outline measured at 118.5 s on the source:
//        lid outer x -87..2256, y -225..1146 (page px), display black x -22..2204, y -133..1081.
//   Base: drawn in its own top-face texture (BASE_TW x BASE_TD px, back edge at y=0, front edge at y=BASE_TD), placed by
//        BASE_REF (texture -> frame at 119.6 s, from the four top-face corners measured on the source) and moved by
//        the measured base track.
import { smoothPath } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";

export const INK = "#2e2626";
// ---------------------------------------------------------------- lid (page coordinates)
export const LID = { x0: -87, y0: -225, x1: 2256, y1: 1146, r: 50 };
export const DISP = { x0: -22, y0: -133, x1: 2204, y1: 1081 };
export const LID_BOX = { x: -110, y: -250, w: 2400, h: 1420, s: 0.6 };   // texture extent (page px) and scale

function rr(g, x0, y0, x1, y1, r, rb = r) {
  g.beginPath();
  g.moveTo(x0 + r, y0); g.lineTo(x1 - r, y0); g.quadraticCurveTo(x1, y0, x1, y0 + r);
  g.lineTo(x1, y1 - rb); g.quadraticCurveTo(x1, y1, x1 - rb, y1);
  g.lineTo(x0 + rb, y1); g.quadraticCurveTo(x0, y1, x0, y1 - rb);
  g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0); g.closePath();
}

// The lid's screen side: silver rim, dark bezel, black glass, camera dot. `page` (optional) is drawn into the display.
export function paintLid(page) {
  const B = LID_BOX, c = document.createElement("canvas");
  c.width = Math.round(B.w * B.s); c.height = Math.round(B.h * B.s);
  const g = c.getContext("2d");
  g.scale(B.s, B.s); g.translate(-B.x, -B.y);
  const L = LID;
  // shell: a warm silver rim (lit from the window at the right), then the dark bezel
  rr(g, L.x0, L.y0, L.x1, L.y1, L.r, 14);
  const rim = g.createLinearGradient(L.x0, 0, L.x1, 0);
  rim.addColorStop(0, "#6f6a6a"); rim.addColorStop(0.5, "#8d8683"); rim.addColorStop(1, "#9c8a74");
  g.fillStyle = rim; g.fill();
  rr(g, L.x0 + 14, L.y0 + 14, L.x1 - 14, L.y1 - 6, L.r - 12, 8);
  g.fillStyle = "#3d3a3e"; g.fill();
  // bezel sheen: slightly lighter toward the top
  const bz = g.createLinearGradient(0, L.y0, 0, L.y1);
  bz.addColorStop(0, "rgba(90,86,90,0.55)"); bz.addColorStop(0.25, "rgba(60,57,61,0)"); bz.addColorStop(1, "rgba(30,28,30,0.2)");
  rr(g, L.x0 + 14, L.y0 + 14, L.x1 - 14, L.y1 - 6, L.r - 12, 8); g.fillStyle = bz; g.fill();
  // display glass
  const D = DISP;
  g.fillStyle = "#0c0b0e"; g.fillRect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0);
  if (page) g.drawImage(page, 0, 0, 2206, 946);
  // camera dot
  g.fillStyle = "#1a181c"; g.beginPath(); g.arc(1103, -182, 9, 0, 7); g.fill();
  g.fillStyle = "rgba(120,120,140,0.5)"; g.beginPath(); g.arc(1100, -185, 3, 0, 7); g.fill();
  // ink: outer outline (heavy), inner bezel line (fine)
  rr(g, L.x0, L.y0, L.x1, L.y1, L.r, 14);
  g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
  rr(g, L.x0 + 12, L.y0 + 12, L.x1 - 12, L.y1 - 4, L.r - 10, 8);
  g.lineWidth = 3; g.strokeStyle = "rgba(20,16,16,0.8)"; g.stroke();
  // a thin bright bevel just inside the outline (the silver edge catching light)
  rr(g, L.x0 + 7, L.y0 + 7, L.x1 - 7, L.y1 - 2, L.r - 5, 10);
  g.lineWidth = 3; g.strokeStyle = "rgba(210,205,200,0.55)"; g.stroke();
  return c;
}

// The back of the lid (seen from 128.6 s on): dark grey aluminium with a soft sheen, rim and outline.
export function paintLidBack() {
  const B = LID_BOX, c = document.createElement("canvas");
  c.width = Math.round(B.w * B.s); c.height = Math.round(B.h * B.s);
  const g = c.getContext("2d");
  g.scale(B.s, B.s); g.translate(-B.x, -B.y);
  const L = LID;
  rr(g, L.x0, L.y0, L.x1, L.y1, L.r, 14);
  const gr = g.createLinearGradient(L.x0, L.y0, L.x1, L.y1);
  gr.addColorStop(0, "#766c65"); gr.addColorStop(0.45, "#645b55"); gr.addColorStop(1, "#524a45");
  g.fillStyle = gr; g.fill();
  const sh = g.createRadialGradient(700, 200, 50, 700, 200, 1600);
  sh.addColorStop(0, "rgba(255,245,230,0.18)"); sh.addColorStop(1, "rgba(255,245,230,0)");
  g.fillStyle = sh; g.fill();
  rr(g, L.x0, L.y0, L.x1, L.y1, L.r, 14); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
  rr(g, L.x0 + 10, L.y0 + 10, L.x1 - 10, L.y1 - 4, L.r - 8, 10); g.lineWidth = 3; g.strokeStyle = "rgba(170,165,160,0.6)"; g.stroke();
  return c;
}

// ---------------------------------------------------------------- base (top-face texture)
export const BASE_TW = 1400, BASE_TD = 860;
// top-face corners at 119.6 s (frame px), measured on 3x gridded crops: back-left, back-right, front-right, front-left
export const BASE_CORNERS_REF = [[680, 673], [1489, 673], [1620, 774], [546, 774]];

// keyboard layout in texture px (measured by mapping the source's key rows back through the reference homography)
export const KB = { x0: 110, x1: 1300, y0: 75, y1: 530 };
export const TPAD = { x0: 470, x1: 945, y0: 590, y1: 815 };

export function paintBaseTop() {
  const c = document.createElement("canvas");
  c.width = BASE_TW; c.height = BASE_TD;
  const g = c.getContext("2d");
  const R = rng(27);
  // deck: silver, warm, lighter toward the front-right (window light)
  const r = 42;
  g.beginPath();
  g.moveTo(r, 0); g.lineTo(BASE_TW - r, 0); g.quadraticCurveTo(BASE_TW, 0, BASE_TW, r);
  g.lineTo(BASE_TW, BASE_TD - r); g.quadraticCurveTo(BASE_TW, BASE_TD, BASE_TW - r, BASE_TD);
  g.lineTo(r, BASE_TD); g.quadraticCurveTo(0, BASE_TD, 0, BASE_TD - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.closePath();
  const dg = g.createLinearGradient(0, 0, BASE_TW, BASE_TD);
  dg.addColorStop(0, "#c2bab4"); dg.addColorStop(0.55, "#cbc1bb"); dg.addColorStop(1, "#ddd4c6");
  g.fillStyle = dg; g.fill();
  g.save(); g.clip();
  // fine brushed mottle
  for (let i = 0; i < 900; i++) {
    const x = R() * BASE_TW, y = R() * BASE_TD;
    g.fillStyle = R() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(60,50,50,0.04)";
    g.fillRect(x, y, 2 + R() * 10, 2);
  }
  g.restore();
  g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  // keyboard well
  const K = KB;
  g.beginPath(); g.roundRect(K.x0 - 16, K.y0 - 10, K.x1 - K.x0 + 32, K.y1 - K.y0 + 22, 18);
  g.fillStyle = "#b2aaa5"; g.fill(); g.lineWidth = 3; g.strokeStyle = "rgba(40,32,32,0.75)"; g.stroke();
  // keys: 6 rows (function row thinner), dark caps with a pale glint on each
  // four visible rows in the held view (read at 2.2x: well y 678–729)
  const rows = [
    { h: 0.8, keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5] },
    { h: 1, keys: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { h: 1, keys: [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7] },
    { h: 1.1, keys: [1, 1, 1, 1.25, 5.2, 1.25, 1, 0.9, 1.4, 0.9] },
  ];
  const totalH = rows.reduce((a, r) => a + r.h, 0);
  const gap = 9;
  let y = K.y0;
  const rowH = (K.y1 - K.y0 - gap * (rows.length - 1)) / totalH;
  for (const row of rows) {
    const h = row.h * rowH, sum = row.keys.reduce((a, b) => a + b, 0);
    const kw = (K.x1 - K.x0 - gap * (row.keys.length - 1)) / sum;
    let x = K.x0;
    for (const k of row.keys) {
      const w = k * kw;
      g.beginPath(); g.roundRect(x, y, w, h, 7);
      g.fillStyle = "#453d3d"; g.fill();
      g.lineWidth = 2; g.strokeStyle = "rgba(15,10,10,0.8)"; g.stroke();
      // glint: a short pale bar near the key's upper-left
      if (R() < 0.75) {
        g.fillStyle = `rgba(235,230,225,${0.55 + 0.35 * R()})`;
        const gw = Math.min(w * 0.5, 22), gx = x + w * (0.2 + 0.4 * R());
        g.save(); g.translate(gx, y + h * 0.5); g.rotate(-0.45); g.fillRect(-gw / 2, -3, gw, 6); g.restore();
      }
      x += w + gap;
    }
    y += h + gap;
  }
  // trackpad
  const T = TPAD;
  g.beginPath(); g.roundRect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0, 14);
  g.fillStyle = "rgba(205,196,190,0.9)"; g.fill();
  g.lineWidth = 4; g.strokeStyle = "rgba(40,32,32,0.85)"; g.stroke();
  return c;
}

// side faces of the base: a silver strip with a darker lower edge; the right side carries the ports
export function paintBaseSide(ports) {
  const c = document.createElement("canvas");
  c.width = ports ? BASE_TD : BASE_TW; c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, "#b3a9a6"); gr.addColorStop(0.6, "#a0948f"); gr.addColorStop(1, "#7c6f6c");
  g.fillStyle = gr; g.fillRect(0, 0, c.width, 64);
  g.fillStyle = "rgba(255,250,240,0.35)"; g.fillRect(0, 2, c.width, 5);
  if (ports) {
    // SD slot + two USB-C ports toward the back of the right side (measured at 125.0 s)
    g.fillStyle = "#2a2426";
    g.beginPath(); g.roundRect(BASE_TD * 0.42, 26, BASE_TD * 0.2, 9, 4); g.fill();
    g.beginPath(); g.roundRect(BASE_TD * 0.68, 22, BASE_TD * 0.09, 16, 7); g.fill();
    g.beginPath(); g.roundRect(BASE_TD * 0.82, 22, BASE_TD * 0.09, 16, 7); g.fill();
    g.fillStyle = "#6a6264"; g.beginPath(); g.arc(BASE_TD * 0.645, 30, 3, 0, 7); g.fill();
  } else {
    g.fillStyle = "rgba(40,32,32,0.5)"; g.fillRect(BASE_TW * 0.72, 40, 120, 4);
    // thumb notch in the middle of the front edge (source hold: x 1010–1160 of the base's 546–1620 front)
    g.beginPath(); g.moveTo(BASE_TW * 0.432, 0); g.quadraticCurveTo(BASE_TW * 0.502, 34, BASE_TW * 0.572, 0); g.closePath();
    g.fillStyle = "#7c6f6c"; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  }
  g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 60); g.lineTo(c.width, 60); g.stroke();
  return c;
}
