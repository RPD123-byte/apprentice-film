export const meta = {
  name: 'apprentice-film-build',
  description: 'Rebuild every shot of the source film in code: foundations, then build → review → fix ×2 per segment, then a continuity critic',
  phases: [
    { title: 'Foundations', detail: 'sōko page + illustration, colour site, Pure Imagination + note card, owl kit (+s09,s12), sound design' },
    { title: 'Build', detail: 'one agent per segment builds src/shots/<id>.js against the source' },
    { title: 'Review', detail: 'adversarial side-by-side review of each segment' },
    { title: 'Fix', detail: 'apply review findings, re-verify' },
    { title: 'Continuity', detail: 'whole-film boundary and gap check' },
  ],
}

const ROOT = '/Users/computer/rootline/apprentice-film'
const SRC = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
const COMMON = `You are one of many agents rebuilding a 140.8 s illustrated short film entirely in code (HyperFrames composition, Canvas2D + WebGL), frame-for-frame against the source.
Project: ${ROOT}. Source film: ${SRC} (2206x946, 25 fps).
FIRST read ${ROOT}/STYLE.md completely and follow it (architecture, shot contract, engraving engine, measuring tools, compare loop, ownership rules, fidelity log). Look at the existing shots src/shots/s01_birdseye.js, src/shots/s40_endcard.js, src/shots/s12.js and libs in src/lib/ before writing code.
Hard rules: everything drawn by code (never load or embed any frame/crop/pixel of the source or any image file); deterministic draw (no Math.random/Date); write only files you own; use your own snapshots/<id>* output dirs; do not render the full film, touch git, or start servers. The designer and the owl are the user's own original characters — recreate them faithfully. Do not reproduce any third-party logo.
Work in ${ROOT} (cd there for tools). Be exhaustive and precise: measure positions, timing and camera moves from the source; iterate with tools/compare.sh and tools/sidebyside.sh until the render matches as closely as you can make it. Report honestly — never overstate fidelity.`

const FOUNDATION_SCHEMA = { type: 'object', properties: {
  name: { type: 'string' }, files: { type: 'array', items: { type: 'string' } },
  api: { type: 'string', description: 'concise API for other agents: exports, signatures, coordinate conventions, constants' },
  status: { type: 'string' }, notes: { type: 'string' } }, required: ['name', 'files', 'api', 'status'] }

const FOUNDATIONS = [
  { key: 'soko', prompt: `${COMMON}

YOUR JOB: foundation F1 — the sōko website ("MIXING DOWN, LATE AT NIGHT.") in full quality. You own src/lib/sites.js, src/lib/sokoIll.js, docs/soko.md, and a provisional src/shots/s17.js (page only, no owl) used as your test bed.
The page appears: tiny on laptops (0–6 s in s01 which imports drawSoko, drawLetters, drawMachines, drawIssue, pageCanvas from sites.js and sokoIllSmall from sokoIll.js — keep those exports working), full-frame at 47.84–53.24 (the owl flies inside it — that owl is NOT yours), and shrunk onto a lit screen with dark margins from 69.44 to ~112 (the owl cuts its header strip out at 74.5–84 and a colour banner replaces it at ~88).
Deliver, all drawn in code in page coordinates 2206x946:
1. The hero illustration (designer seated at a desk facing us among towers of boxes, synths, speakers, lamp, plant, mug, laptop, crate, backpack, the DO NOT KNOCK plate...) as an engraved plate — match the source at 48–53 s region by region (ignore the owl), using grids (tools/grid.py with crops) to place every object; the designer's face/pose must match.
2. The UI: rail/nav, headline (Archivo 900 125% width, measured), counter LCD 000.0, yellow key, sticker — already roughly in drawSoko; refine against the source.
3. Layer API so shots can manipulate parts: e.g. sokoIllCanvas(), sokoPageCanvas({header, rail}), drawSokoHeader(ctx), the exact HEADER strip rectangle the owl cuts out (measure at ~80–84 s where it is outlined) in page coordinates.
4. The framed-screen presentation used 69.44–110.5: measure the page rectangle in frame coordinates (see /Users/computer/rapport-videos/videogen/clips/finish/finish2.py and finish/track2.json for how the source stabilised it) and export FRAMED (rect) + drawFramedPage(ctx, pageCanvas, opts) that draws the page there with the dark surround and the page's light spilling softly into the margins exactly like the source (compare at ~72, ~90, ~105 s).
5. Make sokoIllSmall a downscaled version of the real illustration (or equivalent).
Test with your provisional s17.js (page only) against 48–53 s, and a temporary framed test inside s17 is NOT allowed — instead verify drawFramedPage by comparing numerically/visually in a scratch HTML under tools/ if needed (tools/soko-test.html is yours).
Write docs/soko.md documenting the API for the shot agents (s17, s18, s21–s25, s05, s07 will use it). Return the API.` },
  { key: 'hippie', prompt: `${COMMON}

YOUR JOB: foundation F2 — the colour version of the site ("Mixing down, late at night." retro hippie style). You own src/lib/hippie.js, docs/hippie.md, and a provisional src/shots/s26.js used as your test bed (the s26 builder will complete it later; keep it simple and clearly structured).
Where it appears: a colour banner strip is carried in and slapped over the B&W page header at ~86.5–88.5 and stays on the page through 110.5; at 111.5–117.5 the whole page is the full-colour site (colour illustration: the designer in a green jacket, head on hand, at a desk among colourful stacked boxes, rainbow ribbons, clouds, flowers, plants, stars; the Shrikhand-style headline cream with stacked orange/pink/purple shadow; nav pills top right); it also shows small on the laptop in the morning room (117.5–136).
Reference for layout/fonts/colours ONLY (do not load its images): /Users/computer/rapport-videos/hippie/hero219.html (+ hero.html). Fonts available: Shrikhand, Poppins (loaded in index.html). Everything else drawn in code.
Deliver in page coordinates 2206x946: hippieBannerCanvas() (the strip as it sits in the header slot — measure it at ~95–100 s in frame coords and relate to the B&W page's header rect; coordinate with the sōko page geometry in src/lib/sites.js), hippiePageCanvas() (full colour page, match at 114.5–117.4 s: every element placed from grids; the colour owl is NOT yours), plus any layer helpers a shot will need (e.g. page without headline, illustration only). Provisional s26.js: show the colour page for local time >= 2.3 s so you can compare at 113.5–117.4. Write docs/hippie.md. Return the API.` },
  { key: 'pureimg', prompt: `${COMMON}

YOUR JOB: foundation F3 — the retro "Pure Imagination" web page seen on the laptop at 24–30.5 s and in close-up at 30.56–32.60, plus the feedback note card; and the whole shot s08 (30.56–32.60). You own src/lib/pureimg.js, src/lib/notecard.js, docs/pureimg.md, src/shots/s08.js, fidelity/s08.md.
The page: an ORIGINAL design that reproduces the composition, palette and feel of the source screen (dark background, big rainbow ribbon arcs in pink/purple/orange/yellow with stars, a chunky retro cream wordmark "Pure Imagination" with layered outline/shadow, a date/location line, small nav buttons, a daisy/smiley flower) — but NO copy of any third-party logo or brand mark: replace the source's top-left logo with a simple original mark. Export purePageCanvas(w,h) usable small (laptop) and large (close-up).
The note card: white rounded card with a smiley circle and a trash icon at the top, a bordered textarea, CANCEL | SAVE buttons, a typing caret; typed text "This is really good" appears letter by letter exactly as in the source (measure the per-letter timing at 0.04 s resolution with tools/strip.py crops). Also the red selection rectangle the user drags. Export drawNoteCard(ctx, {x,y,w,h,text,caret,...}) and drawSelection(...). The same card later appears as a physical object in the B&W room (57–69 s) — make the API flexible (drawn at any size, optional B&W/ink-friendly variant).
s08: the screen close-up with the page, selection and card, with the source's exact camera drift (tools/camtrack.py). Iterate against the source. Write docs/pureimg.md and fidelity/s08.md. Return the API.` },
  { key: 'owl', prompt: `${COMMON}

YOUR JOB: foundation F4 — the black-and-white owl kit, plus shots s09 (32.60–33.60, owl close-up with the designer's beanie and a speaker behind it) and s12 (33.60–35.36, same owl pose, the room gone to black; locked-off). You own src/lib/owlInk.js, docs/owl.md, src/shots/s09.js, src/shots/s12.js, fidelity/s09.md, fidelity/s12.md, tools/owl-gallery.html.
Current state: s12.js + owlInk.js are a first pass that reads as a flat grey cut-out covered in mechanical hatch lines — the source owl is a soft, glowing, rounded, nearly-white bird (fine dark accents, feathery edges, big glossy black eyes with white rims, crossed bandage, headphones with a halftone-dotted cup, small hooked beak, talons). Rebuild it to match the source closely (tools/grid.py crops at 34.0 s; compare obsessively).
Then make owlInk.js a reusable KIT that ~15 other shot agents will use to draw this owl in many poses and sizes (sitting 3/4, front, flying with wings spread, walking, tumbling, startled, smirking, angry with scissors, hands-on-hips, carrying things): part functions (eye with states stare/half/closed/startled/angry/smug + look direction; beak closed/open; bandage; headphones front/side/3-4 and band; head and body shapes by centre/size/rotation; folded/raised/spread wings; talons; soft-white plumage shading helper for Plates; feather-edge helper), all parameterised and deterministic. Render a gallery (tools/owl-gallery.html — a scratch page you can screenshot via the browser pane or by temporarily testing inside your own s09/s12 files) to prove poses work, and document everything with examples in docs/owl.md. Return the API.` },
]

const SOUND_PROMPT = `${COMMON}

YOUR JOB: foundation F5 — the soundtrack, synthesized entirely in code. You own tools/sound/ (generator scripts), audio/score.wav, audio/CUES.md, docs/audio.md. Do NOT copy, sample, filter or resynthesize the source's audio — you may only ANALYSE it (extract with ffmpeg into snapshots/audio-work/) to learn what happens when.
1. Analyse the source audio track in depth: loudness envelope (e.g. per 50 ms, both channels), onset detection, spectrogram images per section (make PNGs and Read them), and identify every sound event: room tone/fan hum, thuds, breaths, air rushes, wingbeats, claws on cardboard, trackpad clicks, typing, pops, chimes, footsteps, whooshes, paper creaks/tears/flumps, snips, synth notes, smashed chords, string stabs, electric whine, bass drop, crackle, glassy shatter, birdsong, any music (tempo, key, instrumentation), end-card music and the final fade. Useful context (the original sound brief, not ground truth): /Users/computer/rapport-videos/videogen/animatic2/cue_sheet.tsv and the audio-fix scripts in /Users/computer/rapport-videos/videogen/clips/audiofix/*.py. Watch the film's visual beats with tools/strip.py to align.
2. Write audio/CUES.md: a timed cue list for the whole 140.8 s.
3. Build a deterministic synthesis generator (Python + numpy/scipy is fine; check what is installed) that renders audio/score.wav (48 kHz stereo, exactly 140.8 s) with every cue: physically-motivated synthesis (filtered noise, resonators, FM, additive, Karplus-Strong, granular), stereo placement, room reverb, and a mix whose loudness envelope tracks the source within a few dB per 0.5 s. Music: compose in code to match the source's music in tempo, key, instrumentation and arrangement as closely as analysis allows.
4. Verify: plot source vs yours loudness envelopes and spectrograms side by side (PNG) and iterate until event timings match within 40 ms and the sections read the same. Write docs/audio.md (how to regenerate, what matches, what doesn't). Return the summary in the schema (api = how to regenerate + the output path).`

const SEGMENTS = [
  { id: 's02', deps: ['owl'], brief: `6.04–19.12, one continuous camera. 6.04–~11.2: front close-up of the designer lit by the laptop from below — knit beanie, messy black hair, huge staring eyes with dark rings, sweat drops, a pencil clenched in his teeth, stubble, hoodie; the laptop's top edge is a black bar at the bottom; dark shelves behind. He stares ahead, then his eyes flick to screen-right (~9.3 s) and hold. ~11.2–13.5: the camera pans right off his face (he slides out frame-left) into darkness — shelves, boxes. ~13.5–15.8: dim stacked boxes; the owl (headphones) sits on top of a stack. ~15.8–17.5: it takes off, wings spread, flies; the camera pans back left with it. ~17.5–19.12: his face slides back in from the left, same stare framing; the owl flaps in at screen-right and lands on his shoulder. Measure every pan with tools/camtrack.py (use regions to exclude the moving owl).` },
  { id: 's04', deps: ['owl'], brief: `19.12–23.12, continuous: front close-up of the designer with the owl perched on his right shoulder (screen right), pencil in mouth; he glances sideways at the owl; the camera arcs round to his left to a profile against black (~22 s) and on behind him to an over-the-shoulder view of him typing at the laptop showing the MIXING DOWN page (~22.5–23.1). The owl stays on his shoulder. Measure the arc (it is a 3D orbit — consider cam3d for the room and drawing the figure per key pose with interpolation).` },
  { id: 's05', deps: ['owl', 'soko', 'pureimg'], brief: `23.12–26.72: over-the-shoulder: the designer (beanie, pencil in mouth, headphones? check) types at the laptop on the left of frame, the owl on his shoulder; speakers, cables, boxes. The laptop screen shows the MIXING DOWN page, then a text/document?, then from ~24 s the colourful Pure Imagination page (colour on the screen inside the B&W drawing). Hands type. Map the screen content onto the laptop's screen quad (see mapQuad in s01).` },
  { id: 's06', deps: ['owl'], brief: `26.72–29.04: front view: the designer tired, heavy-lidded, chin resting on his hand holding the pencil; the owl on his shoulder at screen right looking at him; the laptop's top edge at the bottom; at ~28 s he gives a small smile. Subtle motion only — measure.` },
  { id: 's07', deps: ['owl', 'pureimg'], brief: `29.04–30.56: over-the-shoulder again (same framing family as s05): the Pure Imagination page on the laptop, typing, the owl on his shoulder. Reuse ideas from s05 only by copying (you do not own s05.js).` },
  { id: 's13', deps: ['owl'], brief: `35.36–36.92: the owl startled on black: eyes huge with tiny pupils, a sweat drop, beak open, one wing raised; measure its motion.` },
  { id: 's14', deps: ['owl'], brief: `36.92–40.72: wide darkness: the small owl at bottom-left, a distant lit gap between shelves at top-right (the room glimpsed); the owl looks, then hops/flies toward the gap, which grows/brightens; measure the camera and the owl's path precisely.` },
  { id: 's15', deps: ['owl'], brief: `40.72–45.72: the corridor run: the owl runs/flaps away from camera down a narrow corridor of stacked cardboard boxes, keyboards leaning, speakers, rack gear, lit from ahead; the camera follows low and fast; quick whip/motion-blur transitions around 40.96, 41.72, 41.96, 42.72, 42.92, 43.72, 43.92, 44.72, 44.88 (study them frame by frame); near the end the owl comes toward camera. A 3D stroke-rendered corridor (cam3d + engraving) is the natural approach; match the camera path and speed.` },
  { id: 's16', deps: ['owl'], brief: `45.72–47.84: the designer at his desk (beanie, headphones round his neck, laptop with a glowing logo dot, a mug with steam) — the owl flies into his face (~45.7–46.0), then tumbles back onto the desk beside the mug and sits dazed (46–47.5); a white flash ~47.52–47.84 (measure the flash frames exactly).` },
  { id: 's17', deps: ['owl', 'soko'], brief: `47.84–53.24: full-frame, the sōko page (MIXING DOWN, LATE AT NIGHT.) — built by the sōko foundation (docs/soko.md; a provisional src/shots/s17.js exists: you now own it, build on it). The owl is INSIDE the illustration: it flies around above the desk near the mug, flaps, lands, hops (measure its path and wing poses at 0.1–0.2 s steps). Match the page exactly and add the owl animation.` },
  { id: 's18', deps: ['owl', 'soko'], brief: `53.24–57.32: close on the synth from the illustration: 53.24–55.28 the owl lands/walks onto the synth keys next to a speaker and a mixer; 55.28–57.00 extreme close-up of its feet stepping on piano keys (keys depress); 57.00–57.32 near-black/whip (study). Engraved B&W, detailed.` },
  { id: 's19', deps: ['owl', 'pureimg'], brief: `57.32–63.12: low angle on the floor among gear: the note card (a phone-sized white card: smiley, trash icon, "This is really good", CANCEL/SAVE — glowing, drawn as a physical object in the ink world; notecard.js has the UI) propped against a speaker and a milk crate, a guitar case; the owl tumbles in and lands, looks up at the card, dusts itself off (dust puffs), then lifts/pushes the card up. Measure all timing.` },
  { id: 's20', deps: ['owl', 'pureimg'], brief: `63.12–69.44: 63.12–66.84 wider: the card propped by a synth keyboard, big scissors leaning against a speaker at left, smoke puffs, a "MIXING / DO NOT KNOCK" sign; the owl walks to the scissors and takes them. 66.84–69.44: the owl holds the scissors up with a sparkle glint and smirks, one wing on its hip. Measure everything.` },
  { id: 's21', deps: ['owl', 'soko'], brief: `69.44–74.52: the whole sōko page shrunk onto a lit screen in a dark room (docs/soko.md: FRAMED + drawFramedPage); the tiny owl walks in from the bottom-left corner of the page and flies up along the left toward the top. Measure its path.` },
  { id: 's22', deps: ['owl', 'soko'], brief: `74.52–84.04: on the framed page, the owl flies along the header with scissors: a dashed cut line grows around the header strip (along the top left→right, down the right side, back along the bottom, up the left), then the strip gets a solid outline and comes loose, the owl peeling it from the left; the back of the strip is blank white paper (~81–84). Measure every stage's timing and the dash pattern.` },
  { id: 's23', deps: ['owl', 'soko', 'hippie'], brief: `84.04–97.08: the owl flies off the top carrying the header strip (the strip shows MIXING DOWN, LATE AT NIGHT., rotating away top-right, ~84–85.5); the header slot is empty black (~86); the owl carries in the colour banner (docs/hippie.md) from the top right (~86.5–88) and slaps it into the slot (~88.5); walks on the page (89–92); then glows with an aura and a speed ring (92.5–95), scissors flying (~94). Measure everything at 0.1–0.2 s.` },
  { id: 's24', deps: ['owl', 'soko', 'hippie'], brief: `97.08–100.48: a flurry of very fast cuts (97.08, 97.56, 97.6, 97.64, 97.72, 97.76, 97.8, 98.08, 99.0, 99.08, 99.32 — study each frame) of the owl slashing with scissors around the page; a white flash ~97.5; then a speed-lines background: the angry owl (bandage, headphones) flying diagonally with two pairs of scissors (98–100.5).` },
  { id: 's25', deps: ['owl', 'soko', 'hippie'], brief: `100.48–110.52: the framed page with the colour banner on top and the B&W illustration below covered in white cut lines (like shattered glass); the owl stands in the middle, hands on hips, stern, scissors in its wings; scissors open/orbit; more cracks spread (~103.5–105); at ~108 it raises the scissors in both wings. Measure the crack pattern and all motion.` },
  { id: 's26', deps: ['owl', 'soko', 'hippie'], brief: `110.52–117.52: the shards blow outward in colourful fragments (110.5–112.5, cuts at 111.56, 111.64, 112.6, 112.72, 112.76, 113.6 — study), the owl spreads its wings, the full colour page is revealed (docs/hippie.md; a provisional src/shots/s26.js exists — you now own it); the owl, now in colour (cream, orange headphones), flies up to the top-right corner and perches by the nav (113.5–117.5). The colour owl kit is src/lib/owlColor.js (read-only — copy if you need variants).` },
  { id: 's27', deps: ['hippie'], brief: `117.52–129.30, colour, warm morning, illustrated anime style with ink outlines: a whip/blur transition (117.52–117.8) pulling back out of the screen; a laptop on a light wood desk showing the colour site (docs/hippie.md), speakers, a mug, a notebook, shelves with plants, window light; the camera holds, then pans left (~121) to reveal the designer asleep at the desk, head on folded arms (beanie, headphones round his neck, green jacket), peaceful smile; the colour owl appears from the laptop screen and sits on the keyboard (~126–128). Measure the camera precisely (camtrack).` },
  { id: 's28', deps: ['hippie'], brief: `129.30–136.00, colour: from behind the laptop's dark grey lid (foreground), the designer asleep behind it, sunlit room with shelves, plants, sun rays; slow camera drift; a slight smile/breath. The end card (s40) dissolves in over the last 0.9 s — your shot keeps drawing underneath until 136.0 only, so make sure it looks right at 135.9.` },
]

const REFINE = [
  { id: 's01', file: 'src/shots/s01_birdseye.js', note: 'Bird\'s-eye push-in (0–6.04). Currently approx: flat figure, cartoon hands, beanie moiré, wrong lamp shade, stray desk-outline arcs, periphery tone. You may also switch the laptop page to the new sōko page API (docs/soko.md).' },
  { id: 's40', file: 'src/shots/s40_endcard.js', note: 'End card (136–140.8). Currently close: wordmark a little light vs the source\'s heavier Cooper-style face, clouds sit higher than the source, print grain weaker, owl details.' },
]

const BUILD_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, status: { type: 'string', enum: ['close', 'approx', 'simplified', 'cut'] },
  beats: { type: 'string', description: 'the measured beats and how each is reproduced' },
  known_gaps: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['id', 'status', 'known_gaps', 'summary'] }
const REVIEW_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, fidelity: { type: 'string', enum: ['close', 'approx', 'simplified', 'cut', 'broken'] },
  defects: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['high', 'medium', 'low'] }, at: { type: 'string' }, what: { type: 'string' }, fix: { type: 'string' } },
    required: ['severity', 'at', 'what', 'fix'] } },
  deterministic: { type: 'boolean' }, errors_seen: { type: 'boolean' }, verdict: { type: 'string' } }, required: ['id', 'fidelity', 'defects', 'deterministic', 'errors_seen', 'verdict'] }
const FIX_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, status: { type: 'string', enum: ['close', 'approx', 'simplified', 'cut'] },
  fixed: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'string' } } }, required: ['id', 'status', 'fixed', 'remaining'] }

const planLine = (id) => `Your segment's timing is fixed in src/shots/index.js PLAN (id ${id}).`

function reviewPrompt(id, file, round, prior) {
  return `${COMMON}

YOUR JOB: adversarial REVIEW #${round} of segment ${id} (${file}). You did not build it; your job is to find everything that differs from the source, harshly and specifically. Do not edit any source files. Use snapshots/${id}-rev${round}* for output.
1. Render dense comparisons: tools/compare.sh at every 0.25–0.5 s across the segment plus the first frame (start+0.02) and last frame (end-0.02), and tools/sidebyside.sh over the whole segment at 5–10 fps for motion. Read the pair images and sheets carefully.
2. Check: every action/beat present at the same time (±2 frames at cuts and key moments); framing/composition and camera moves (measure with tools/camtrack.py on the source if in doubt); tone/light (too bright/grey vs deep black; colour accuracy in colour shots); line quality (moiré, boiling between frames, mechanical hatching on characters); character likeness and silhouettes; missing objects; text/UI; boundary continuity with neighbouring segments (render the frames just before start and just after end); placeholder text or red error bars.
3. Determinism: render the same timestamp in two separate compare runs and diff the frame PNGs with python (must be identical or near-identical).
${prior ? 'Previous review for comparison (check which items were fixed and what is still wrong):\n' + prior + '\n' : ''}Return defects ranked most visible first, each with a concrete, actionable fix (coordinates, times, values). Rate fidelity honestly.`
}
function fixPrompt(id, file, review, round) {
  return `${COMMON}

YOUR JOB: FIX pass #${round} on segment ${id}. You own ${file} (and src/shots/${id}/ helpers, fidelity/${id}.md). ${planLine(id)}
An independent reviewer compared it to the source and found:
${review}
Fix every high and medium defect you can, then low ones, verifying each with tools/compare.sh / tools/sidebyside.sh (dirs snapshots/${id}-fix${round}*). Measure from the source rather than guessing. Keep draw deterministic and ≤ ~300 ms/frame. Update fidelity/${id}.md honestly (status + remaining gaps). Return what you fixed and what remains.`
}
const fmtReview = (r) => r ? JSON.stringify({ fidelity: r.fidelity, defects: r.defects, deterministic: r.deterministic, errors_seen: r.errors_seen, verdict: r.verdict }, null, 1) : '(review unavailable — do your own thorough comparison against the source)'

// ---------------- Phase 1: foundations (+ sound in the background) ----------------
phase('Foundations')
const soundP = agent(SOUND_PROMPT, { label: 'F5 sound design', phase: 'Foundations', schema: FOUNDATION_SCHEMA })
// refine passes on the two existing shots can start right away
const refineP = pipeline(REFINE,
  (r) => agent(reviewPrompt(r.id, r.file, 1, null) + '\nContext: ' + r.note, { label: `review1:${r.id}`, phase: 'Review', schema: REVIEW_SCHEMA }),
  (rev, r) => agent(fixPrompt(r.id, r.file, fmtReview(rev), 1) + '\nContext: ' + r.note, { label: `fix1:${r.id}`, phase: 'Fix', schema: FIX_SCHEMA }).then((fix) => ({ rev1: rev, fix1: fix })),
  (prev, r) => agent(reviewPrompt(r.id, r.file, 2, fmtReview(prev.rev1)), { label: `review2:${r.id}`, phase: 'Review', schema: REVIEW_SCHEMA }).then((rev2) => ({ ...prev, rev2 })),
  (prev, r) => agent(fixPrompt(r.id, r.file, fmtReview(prev.rev2), 2), { label: `fix2:${r.id}`, phase: 'Fix', schema: FIX_SCHEMA }).then((fix2) => ({ id: r.id, ...prev, fix2 })),
)
const found = await parallel(FOUNDATIONS.map((f) => () => agent(f.prompt, { label: `F:${f.key}`, phase: 'Foundations', schema: FOUNDATION_SCHEMA })))
const API = {}
FOUNDATIONS.forEach((f, i) => { API[f.key] = found[i] ? `### ${found[i].name}\nFiles: ${found[i].files.join(', ')}\nAPI:\n${found[i].api}\nNotes: ${found[i].notes || ''}` : `### ${f.key}: foundation agent failed — read docs/ and src/lib/ directly` })
log('Foundations done: ' + FOUNDATIONS.map((f, i) => `${f.key}=${found[i] ? found[i].status : 'FAILED'}`).join(', '))

// ---------------- Phase 2: segments — build → review → fix → review → fix ----------------
const ITEMS = [...SEGMENTS, { id: 's09', deps: ['owl'], brief: 'built by the owl foundation', owned: true }, { id: 's12', deps: ['owl'], brief: 'built by the owl foundation', owned: true }, { id: 's08', deps: ['pureimg'], brief: 'built by the Pure Imagination foundation', owned: true }]
const segs = await pipeline(ITEMS,
  (s) => s.owned ? Promise.resolve({ id: s.id, status: 'built-by-foundation', known_gaps: [], summary: 'foundation-built' }) : agent(`${COMMON}

YOUR JOB: BUILD segment ${s.id} → write src/shots/${s.id}.js (export const shot = {...}) and fidelity/${s.id}.md. ${planLine(s.id)}
What happens (from a first look — verify and refine by measuring the source; the source is the truth): ${s.brief}
Shared foundations you should use (read their docs/*.md and code first):
${s.deps.map((d) => API[d]).join('\n\n')}
Process: (1) study the source in detail — tools/strip.py over the whole segment at 0.1–0.2 s (crops for detail), tools/grid.py at key frames, tools/camtrack.py for every camera move; write down a beat list with exact times; (2) build; (3) compare at least 8 rounds (tools/compare.sh at many times + tools/sidebyside.sh for motion), fixing the biggest differences first each round; (4) write fidelity/${s.id}.md honestly. Return the schema.`, { label: `build:${s.id}`, phase: 'Build', schema: BUILD_SCHEMA }),
  (b, s) => agent(reviewPrompt(s.id, `src/shots/${s.id}.js`, 1, null), { label: `review1:${s.id}`, phase: 'Review', schema: REVIEW_SCHEMA }).then((rev1) => ({ build: b, rev1 })),
  (p, s) => agent(fixPrompt(s.id, `src/shots/${s.id}.js`, fmtReview(p.rev1), 1) + `\nShared APIs:\n${s.deps.map((d) => API[d]).join('\n\n')}`, { label: `fix1:${s.id}`, phase: 'Fix', schema: FIX_SCHEMA }).then((fix1) => ({ ...p, fix1 })),
  (p, s) => agent(reviewPrompt(s.id, `src/shots/${s.id}.js`, 2, fmtReview(p.rev1)), { label: `review2:${s.id}`, phase: 'Review', schema: REVIEW_SCHEMA }).then((rev2) => ({ ...p, rev2 })),
  (p, s) => agent(fixPrompt(s.id, `src/shots/${s.id}.js`, fmtReview(p.rev2), 2) + `\nShared APIs:\n${s.deps.map((d) => API[d]).join('\n\n')}`, { label: `fix2:${s.id}`, phase: 'Fix', schema: FIX_SCHEMA }).then((fix2) => ({ id: s.id, ...p, fix2 })),
)
const refined = await refineP

// ---------------- Phase 3: continuity critic over the whole film ----------------
phase('Continuity')
const continuity = await agent(`${COMMON}

YOUR JOB: whole-film CONTINUITY CRITIC. Do not edit files. Use snapshots/continuity*.
Render comparisons of the entire film: tools/compare.sh at every 1.0 s from 0.5 to 140.5 (split into batches of ~20 times), plus every segment boundary in src/shots/index.js PLAN at boundary-0.04 and boundary+0.04. Read everything.
Report: any placeholder ("not built yet") or red error bar; any segment whose framing/tone/timing clearly departs from the source; hard cuts landing on the wrong frame; jumps in continuity across boundaries (the owl or designer changing design or position between adjacent shots where the source is continuous); dissolves/flashes missing; the global grade looking wrong anywhere. Rank by visibility with exact times and the responsible segment id.`, { label: 'continuity critic', phase: 'Continuity', schema: { type: 'object', properties: {
  issues: { type: 'array', items: { type: 'object', properties: { at: { type: 'string' }, segment: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, what: { type: 'string' }, fix: { type: 'string' } }, required: ['at', 'segment', 'severity', 'what', 'fix'] } },
  summary: { type: 'string' } }, required: ['issues', 'summary'] } })
const sound = await soundP

return {
  foundations: found.map((f, i) => f ? { key: FOUNDATIONS[i].key, status: f.status, files: f.files } : { key: FOUNDATIONS[i].key, failed: true }),
  sound: sound ? { status: sound.status, files: sound.files, api: sound.api, notes: sound.notes } : null,
  segments: segs.filter(Boolean).map((s) => ({ id: s.id, build: s.build && s.build.status, rev1: s.rev1 && s.rev1.fidelity, rev2: s.rev2 && s.rev2.fidelity, final: s.fix2 && s.fix2.status, remaining: s.fix2 && s.fix2.remaining })),
  refined: (refined || []).filter(Boolean).map((r) => ({ id: r.id, rev1: r.rev1 && r.rev1.fidelity, rev2: r.rev2 && r.rev2.fidelity, final: r.fix2 && r.fix2.status, remaining: r.fix2 && r.fix2.remaining })),
  continuity,
}
