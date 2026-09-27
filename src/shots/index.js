// Shot table. PLAN is authoritative for timing (cut times measured on the source film).
// Each segment lives in its own module, src/shots/<id>.js, exporting `shot`:
//   { draw(ctx, local, t), xfade?: seconds (dissolve up over the previous shot), grade?: (local, t) => ({ halo, grain }),
//     release?: () => void (free caches when the timeline leaves the shot) }
// Modules are loaded independently: a missing or broken segment falls back to a labelled placeholder.
export const PLAN = [
  ["s01", 0.0, 6.04, "Bird's-eye push-in over the desk"],
  ["s02", 6.04, 19.12, "The stare; pan off his face into the dark boxes; the owl on the boxes takes off and flies to him"],
  ["s04", 19.12, 23.12, "Owl on his shoulder; camera arcs round behind him"],
  ["s05", 23.12, 26.72, "Over the shoulder: typing; the laptop goes from his site to Pure Imagination"],
  ["s06", 26.72, 29.04, "Tired, head on hand, a small smile; owl on his shoulder"],
  ["s07", 29.04, 30.56, "Over the shoulder again on Pure Imagination"],
  ["s08", 30.56, 32.6, "Screen close-up: red selection, the note card types 'This is really good'"],
  ["s09", 32.6, 33.6, "Owl close-up, the room still behind it"],
  ["s12", 33.6, 35.36, "The room drops away: the owl stares on black"],
  ["s13", 35.36, 36.92, "Owl startled"],
  ["s14", 36.92, 40.72, "Small owl in the dark heads for a lit gap"],
  ["s15", 40.72, 45.72, "Corridor run through boxes and gear"],
  ["s16", 45.72, 47.84, "It flies into his face; tumbles by the mug; white flash"],
  ["s17", 47.84, 53.24, "Full-frame: his site, MIXING DOWN, the owl flying inside the illustration"],
  ["s18", 53.24, 57.32, "Close on the synth; the owl's feet on the keys"],
  ["s19", 57.32, 63.12, "Low angle: the note card propped up, the owl tumbles, dusts off, lifts it"],
  ["s20", 63.12, 69.44, "Wide: scissors against the speaker; the owl takes them; the smirk"],
  ["s21", 69.44, 74.52, "The page, framed on the screen: the owl walks in and flies up"],
  ["s22", 74.52, 84.04, "It cuts round the header: dashed line, outline, the strip comes loose"],
  ["s23", 84.04, 97.08, "Carries the strip away, brings the colour banner, slaps it on, glows"],
  ["s24", 97.08, 100.48, "Flurry of cuts, white flash, speed lines: the owl with scissors"],
  ["s25", 100.48, 110.52, "The page cut into shards; the owl stands in the middle, hands on hips"],
  ["s26", 110.52, 117.52, "The shards blow out into colour: the finished site"],
  ["s27", 117.52, 129.3, "Pull back into the morning room; pan to him asleep; the owl on the laptop"],
  ["s28", 129.3, 136.0, "From behind the laptop: asleep, smiling, in the sun"],
  ["s40", 136.0, 140.8, "End card"],
];

// Existing modules that predate the <id>.js naming.
const FILES = { s01: "./s01_birdseye.js", s40: "./s40_endcard.js" };

const todo = (id, title) => ({
  draw(ctx) {
    ctx.fillStyle = "#2a2a2a";
    ctx.font = "400 22px 'Geist Mono'";
    ctx.fillText(`[${id}] not built yet — ${title}`, 40, 60);
  },
});

const mods = await Promise.allSettled(PLAN.map(([id]) => import(FILES[id] ?? `./${id}.js`)));

export const SHOTS = PLAN.map(([id, start, end, title], i) => {
  const r = mods[i];
  let s = null;
  if (r.status === "fulfilled") s = r.value.shot ?? r.value[id] ?? null;
  else if (!/Failed to fetch|Cannot find|404/.test(String(r.reason))) console.error(`[${id}] failed to load:`, r.reason);
  if (!s) s = todo(id, title);
  s.id = id; s.start = start; s.end = end; s.title = title;
  return s;
});
