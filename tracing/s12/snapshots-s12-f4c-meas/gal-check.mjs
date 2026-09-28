
  import { paintGallery, drawOwl, owlPose, POSES, EYE_STATES, FIT_PLACE } from "../src/lib/owlInk.js";
  const c = document.getElementById("c"), g = c.getContext("2d");
  const $ = (id) => document.getElementById(id);
  for (const k of Object.keys(POSES)) $("pose").add(new Option(k, k));
  $("eye").add(new Option("(preset)", ""));
  for (const k of Object.keys(EYE_STATES)) $("eye").add(new Option(k, k));
  Object.keys(FIT_PLACE).forEach((k, i) => $("fit").add(new Option(`${k} (source ${FIT_PLACE[k].t} s)`, String(10 + i))));
  $("fit").oninput = () => { if ($("fit").value) { page = +$("fit").value; render(); } };
  $("pose").value = "perch";
  let page = 0;
  function playground() {
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
    const base = POSES[$("pose").value];
    const yaw = +$("yaw").value, pitch = +$("pitch").value, roll = +$("roll").value;
    const over = {
      head: { yaw: (base.head.yaw || 0) + yaw, pitch: (base.head.pitch || 0) + pitch, roll: (base.head.roll || 0) + roll },
      headphones: base.headphones && base.headphones.yaw !== undefined ? { yaw: base.headphones.yaw + yaw } : {},
      eyes: { look: [+$("lx").value, +$("ly").value], ...($("eye").value ? { state: $("eye").value } : {}) },
      beak: { open: +$("open").value },
    };
    const a = drawOwl(g, { ...owlPose($("pose").value, over), x: 1103, y: 520, s: +$("s").value, rot: +$("rot").value, flip: $("flip").checked });
    // anchors
    g.fillStyle = "#e33";
    for (const p of [a.head, a.beak, ...a.eyes, ...a.wingTips, ...a.feet]) { g.beginPath(); g.arc(p[0], p[1], 4, 0, 7); g.fill(); }
    g.strokeStyle = "#444"; g.strokeRect(a.bbox[0], a.bbox[1], a.bbox[2] - a.bbox[0], a.bbox[3] - a.bbox[1]);
  }
  function render() {
    $("play").style.display = page === 2 ? "inline-flex" : "none";
    if (page === 2) playground(); else paintGallery(g, page, c.width, c.height);
  }
  for (const b of document.querySelectorAll("button[data-page]")) b.onclick = () => { page = +b.dataset.page; render(); };
  for (const el of document.querySelectorAll("#play input, #play select")) el.oninput = render;
  await document.fonts.ready;
  render();
