export const meta = {
  name: 'apprentice-ending',
  description: 'Improve the film\'s colour ending (s26–s28): restore the traced builds of s27, s28 and the colour site, deep-fix s26, review/fix, then an ending critic and targeted fixes',
  phases: [
    { title: 'Restore', detail: 'traced colour site (hippie.js), traced s28, then traced s27' },
    { title: 'Fix', detail: 'deep fix of s26; fix passes on s26–s28 from reviews' },
    { title: 'Review', detail: 'visual-first adversarial reviews of each shot' },
    { title: 'Ending critic', detail: '97–140.8 vs source AND vs the current render; seams; s23–s25 regressions' },
    { title: 'Targeted fix', detail: 'one agent per shot the critic flags' },
  ],
}

const ROOT = '/Users/computer/rootline/apprentice-film'
const SRC = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
const COMMON = `You are one of several agents improving the ENDING of a 140.8 s illustrated short film rebuilt entirely in code (HyperFrames composition, Canvas2D + WebGL), frame-for-frame against the source. The film is the user's own work.
Project: ${ROOT} (now its own git repo — do NOT run git commands; the orchestrator commits). Source film: ${SRC} (2206x946, 25 fps).
FIRST read ${ROOT}/STYLE.md completely and follow it — especially the new "User decision (2026-09-27), the ending" paragraph: for s26, s27, s28 and src/lib/hippie.js the user has approved TRACED geometry (vector traces of source frames — colour regions, ink, rotoscoped keys, fitted gains — stored as numbers/paths and painted by code). Fidelity to the source comes first. Still never load or embed any source pixel/crop/image file in the render.
The user's complaint: the ending "falls off" — the colour section looks noticeably worse than the rest. Judge like a viewer first: at normal viewing size, side by side, what does a person notice? Fix those things first; use metrics (blurred abs diff / ΔE at σ4 and σ12) to confirm, not to veto an obvious visual improvement.
Rules: deterministic draw (no Math.random/Date); write only files you own; use your own snapshots/<tag>* dirs; do not render the full film, start servers, or touch git. The designer and the owl are the user's own original characters. Never draw a third-party logo or well-known character; no song lyrics or copyrighted text on screen.
Tools (cd ${ROOT}): tools/compare.sh T1,T2,... outdir (render|source pairs), tools/sidebyside.sh START END FPS outdir (motion sheet), tools/grid.py, tools/strip.py, tools/camtrack.py, tools/refframe.sh. Note from earlier reviews: snapshot time is floored to 1/30 s and --against may pair with the next source frame for off-grid times; request T = k/30 + 0.0005 or decode source frames by index when you need exact frame pairing.
The CURRENT full render (the baseline before this round) is ${ROOT}/renders/film.mp4 — extract its frames with ffmpeg to compare before/after.
Work in small, verified increments so an interruption never leaves a shot broken; keep fidelity/<id>.md current (first line = table row | id | start–end | what | status | notes |). Delete your own intermediate snapshot folders when done (keep one final comparison folder). Report honestly.`

const FIX_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, status: { type: 'string', enum: ['close', 'approx', 'simplified', 'cut'] },
  fixed: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'string' } },
  metrics: { type: 'string', description: 'before → after numbers on the same frames' } }, required: ['id', 'status', 'fixed', 'remaining'] }
const REVIEW_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, fidelity: { type: 'string', enum: ['close', 'approx', 'simplified', 'cut', 'broken'] },
  vs_baseline: { type: 'string', enum: ['better', 'same', 'worse', 'mixed'] },
  defects: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['high', 'medium', 'low'] }, at: { type: 'string' }, what: { type: 'string' }, fix: { type: 'string' } },
    required: ['severity', 'at', 'what', 'fix'] } },
  deterministic: { type: 'boolean' }, verdict: { type: 'string' } }, required: ['id', 'fidelity', 'vs_baseline', 'defects', 'deterministic', 'verdict'] }
const fmt = (r) => r ? JSON.stringify({ fidelity: r.fidelity, vs_baseline: r.vs_baseline, defects: r.defects, deterministic: r.deterministic, verdict: r.verdict }, null, 1) : '(review unavailable — do your own thorough side-by-side against the source first)'

const SHOT = {
  s26: { span: '110.52–117.52', file: 'src/shots/s26.js (+ src/shots/s26/)', what: 'the cracked page blows out into colour; the white owl throws its wings open over the arriving colour site; the owl, now in colour, flies up and perches on the top-right box by the nav' },
  s27: { span: '117.52–129.30', file: 'src/shots/s27.js (+ src/shots/s27/)', what: 'whip/pull back out of the screen into the sunny morning room; hold on the laptop; pan left to the designer asleep on his arms; the owl climbs out of the page and lands on the keyboard' },
  s28: { span: '129.30–136.00', file: 'src/shots/s28.js (+ src/shots/s28/)', what: 'from behind the laptop lid: the camera orbits ~42° round the sleeping designer and locks; he breathes, eyes close and reopen; sunlit room; the end card (s40) dissolves in from ~135.72' },
}

function reviewPrompt(id, round) {
  const s = SHOT[id]
  return `${COMMON}

YOUR JOB: adversarial REVIEW (round ${round}) of ${id} (${s.span}: ${s.what}). Do not edit source files. Output in snapshots/end-${id}-rev${round}*.
1. tools/compare.sh every 0.25 s across the shot plus start+0.02 and end-0.04, and tools/sidebyside.sh over the whole shot at 10 fps. Also extract the SAME times from renders/film.mp4 (the previous render) so you can say whether this version is better, same, worse or mixed vs that baseline.
2. Look first as a viewer: character likeness (face, hair, expression, hands), the owl's design/colour, drawing density and texture, colour and light, framing and camera, timing of every beat, the cuts in and out (render the neighbour shots' frames either side), anything flat, blobby, doubled, popping or boiling. Then confirm with numbers.
3. Determinism: render one time twice in separate runs and diff.
Return defects ranked by how visible they are, each with a concrete, actionable fix (times, coordinates, values).`
}
function fixPrompt(id, round, reviewText, extra) {
  const s = SHOT[id]
  return `${COMMON}

YOUR JOB: FIX round ${round} on ${id} (${s.span}: ${s.what}). You own ${s.file} and fidelity/${id}.md. Shot timing is fixed in src/shots/index.js PLAN.
${extra || ''}
An independent reviewer found:
${reviewText}
Fix every high and medium defect, then low ones, verifying each with tools/compare.sh / tools/sidebyside.sh (snapshots/end-${id}-fix${round}*). Measure from the source. Keep draw deterministic and ≤ ~300 ms/frame. Check the cut into and out of your shot. Return what you fixed (with before→after numbers) and what remains.`
}

// ---------------- Restore: colour site + s28 now; s27 and s26 once the site is back ----------------
phase('Restore')
const hippieP = agent(`${COMMON}

YOUR JOB: RESTORE the traced colour site. You own src/lib/hippie.js and docs/hippie.md only.
The current src/lib/hippie.js is a hand-drawn rebuild (blurred ΔE ≈ 8.5 on the page at 117.4 s). The earlier TRACED page measured ΔE ≈ 3.2 and is archived at archive/prev-builds/f2r-prev/ (hippie.traced.js, hippie.traced.md, s26.at-start.js). Read both versions and docs/hippie.md.
1. grep every import of '../lib/hippie.js' / 'hippie.js' across src/ (s23, s24, s25, s26, s27 and any others) and list every export and option they use.
2. Make src/lib/hippie.js paint the TRACED page/illustration/banner again while keeping every export and signature the current shots use working (add compatibility shims where the APIs diverged). Keep the current drawn code only if something the shots need exists only there.
3. Verify with tools/compare.sh at page-visible times in every dependent shot — s23 (88.6, 90, 92, 95, 96.8), s24 (97.2, 98.5, 100.3), s25 (101, 104, 107, 110.3), s26 (114, 115.5, 117.4), s27 (118, 120, 124, 128) — and against the matching frames of renders/film.mp4. Measure the page/banner region ΔE (σ8) before vs after at each. No dependent shot may break (error bar) or regress visibly; if one regresses because its own code assumed the drawn page's geometry, fix the lib to be compatible, or report exactly what that shot's owner must change.
4. Update docs/hippie.md (method: traced, per the user's decision). Return a summary: exports, per-shot before→after numbers, and anything a shot owner must adapt.`, { label: 'restore:hippie', phase: 'Restore', schema: { type: 'object', properties: {
  exports: { type: 'string' }, results: { type: 'string' }, owner_actions: { type: 'array', items: { type: 'string' } }, status: { type: 'string' } }, required: ['results', 'owner_actions', 'status'] } })

const restorePrompt = (id, archive, helpers) => `${COMMON}

YOUR JOB: RESTORE the traced build of ${id} (${SHOT[id].span}: ${SHOT[id].what}), then make it fit the film as it is now. You own ${SHOT[id].file} and fidelity/${id}.md.
The shot currently in the film is a hand-drawn rebuild that looks clearly worse than the source. The earlier TRACED build measured close to the source and is archived at ${archive} (read its .md: method, files, numbers). ${helpers}
1. Restore it as the active src/shots/${id}.js. Keep the current drawn build's files in place (git has history; do not delete anything) — just stop importing them.
2. It was written against older versions of shared libs/neighbour shots; fix any API drift until it renders cleanly (no error bars, no console errors) across the whole shot.
3. Measure the restored build vs the drawn build on the same frames (every 2nd frame across the shot; the drawn build = renders/film.mp4) and vs the source: blurred abs diff σ4/σ12 (or ΔE). Keep the better one per the numbers AND by eye — expected: the traced build is far closer.
4. Check the cuts into and out of the shot (neighbour frames) and fix any seam your shot can fix. Update fidelity/${id}.md (method: traced). Return before→after numbers and remaining defects.`

const s28Chain = (async () => {
  const restore = await agent(restorePrompt('s28', 'archive/prev-builds/s28-prev/ (s28.traced.js, s28.traced.md)', 'Its helpers are still in src/shots/s28/ (keys/, resid.js, depth.js, keygain.js, corr.js, data.js, cam.js, draw.js, gl.js, lidcol.js, trace.js). The end-card overlay comes from src/shots/s40/card.js (read-only). s27 is being restored to its traced build in parallel by another agent — the 129.30 seam should be re-checked once that lands (a later agent handles it if you cannot).'), { label: 'restore:s28', phase: 'Restore', schema: FIX_SCHEMA })
  const rev = await agent(reviewPrompt('s28', 1), { label: 'review:s28', phase: 'Review', schema: REVIEW_SCHEMA })
  const fix = await agent(fixPrompt('s28', 1, fmt(rev)), { label: 'fix:s28', phase: 'Fix', schema: FIX_SCHEMA })
  return { id: 's28', restore, rev, fix }
})()

const s27Chain = hippieP.then(async (h) => {
  const hippieNote = h ? `The colour site lib was just restored to its traced version: ${h.results}\nActions for shot owners: ${(h.owner_actions || []).join(' | ') || 'none'}` : 'The colour site restore agent failed — read src/lib/hippie.js and docs/hippie.md as they are.'
  const restore = await agent(restorePrompt('s27', 'archive/prev-builds/s27d-prev/ (s27.traced.js, s27.traced.md)', `Its helpers should still be in src/shots/s27/ (keys/, dkeys/, data.js, data2.js, data3.js, owlTrace.js, roomA.js, roomB.js, roomC.js, codec.js, gl.js, paint.js, …). ${hippieNote} Known weak spots of the traced build: the two whip frames 117.52/117.56 and the lid's edge-on pass at ~128.5 — fix those too.`), { label: 'restore:s27', phase: 'Restore', schema: FIX_SCHEMA })
  const rev = await agent(reviewPrompt('s27', 1), { label: 'review:s27', phase: 'Review', schema: REVIEW_SCHEMA })
  const fix = await agent(fixPrompt('s27', 1, fmt(rev)), { label: 'fix:s27', phase: 'Fix', schema: FIX_SCHEMA })
  return { id: 's27', restore, rev, fix }
})

const S26_BRIEF = `This shot never had a close build, so this is a deep rework. Tracing the source is allowed here (see STYLE.md). What a viewer notices most (measured on the current render vs the source):
- 111.9–113.8: the white owl with wings thrown open reads as a flat white egg/blob. The source owl is a detailed white owl: face with eyes, bandage and headphones, feathered wings with distinct primaries, fine dark accents. Rebuild these poses (trace them from the source frames: silhouette, ink, value regions) so they match frame by frame.
- ~113.6–113.8: the left third is covered by large dark/black B&W shards; the source shows mostly the colourful page there with a few grey shards and the big out-of-focus lens shard.
- 114.4–117.5: the colour owl is the wrong design and colour (grey-brown, different face). The source's colour owl is cream/ivory with orange headphones — the same character as in s27 and the end card s40 (see src/shots/s27/ owl code and src/shots/s40/ for the traced/drawn colour owl you can copy from, read-only). Match its flight up to the top-right box and the perch.
- The shard field / ring / blow-out (110.52–112.8): colours, sizes and motion per frame vs source; speed lines; the jolt.
- Cuts: 110.52 from s25 (must be seamless) and 117.52 into s27's whip.
Also read fidelity/s26.md (known gaps from earlier passes) and archive/prev-builds/s26* for earlier approaches.`

const s26Chain = hippieP.then(async (h) => {
  const hippieNote = h ? `The colour site lib (src/lib/hippie.js) was just restored to its traced version: ${h.results}\nActions for shot owners: ${(h.owner_actions || []).join(' | ') || 'none'}` : 'The colour site restore agent failed — use src/lib/hippie.js as it is.'
  const fix1 = await agent(fixPrompt('s26', 1, '(no review yet — the brief below is the review)', `${hippieNote}\n\n${S26_BRIEF}`), { label: 'deepfix:s26', phase: 'Fix', schema: FIX_SCHEMA })
  const rev1 = await agent(reviewPrompt('s26', 1), { label: 'review1:s26', phase: 'Review', schema: REVIEW_SCHEMA })
  const fix2 = await agent(fixPrompt('s26', 2, fmt(rev1)), { label: 'fix2:s26', phase: 'Fix', schema: FIX_SCHEMA })
  const rev2 = await agent(reviewPrompt('s26', 2), { label: 'review2:s26', phase: 'Review', schema: REVIEW_SCHEMA })
  const fix3 = await agent(fixPrompt('s26', 3, fmt(rev2)), { label: 'fix3:s26', phase: 'Fix', schema: FIX_SCHEMA })
  return { id: 's26', fix1, rev1, fix2, rev2, fix3 }
})

const [hippie, c28, c27, c26] = await parallel([() => hippieP, () => s28Chain, () => s27Chain, () => s26Chain])
log('Chains done: ' + [c26, c27, c28].map((c, i) => c ? `${c.id} ${(c.fix3 || c.fix || {}).status || '?'}` : ['s26', 's27', 's28'][i] + ' FAILED').join(', '))

// ---------------- Ending critic (needs every chain finished) ----------------
phase('Ending critic')
const CRIT_SCHEMA = { type: 'object', properties: {
  per_shot: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, vs_baseline: { type: 'string', enum: ['better', 'same', 'worse', 'mixed'] }, vs_source: { type: 'string' }, numbers: { type: 'string' } }, required: ['id', 'vs_baseline', 'vs_source'] } },
  issues: { type: 'array', items: { type: 'object', properties: { at: { type: 'string' }, segment: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, what: { type: 'string' }, fix: { type: 'string' } }, required: ['at', 'segment', 'severity', 'what', 'fix'] } },
  summary: { type: 'string' } }, required: ['per_shot', 'issues', 'summary'] }
const critic = await agent(`${COMMON}

YOUR JOB: ENDING CRITIC. Do not edit files. Output in snapshots/end-critic*.
1. tools/compare.sh every 0.5 s from 97.0 to 140.5 (batches of ~20), plus the cuts at 97.08, 100.48, 110.52, 117.52, 129.30, 136.00 at cut−0.04 and cut+0.04. Extract the same times from renders/film.mp4 (the previous render) — for every shot s23–s28 and s40 say better / same / worse / mixed vs that baseline, and how close to the source (numbers: blurred abs diff σ4/σ12 per shot, current vs baseline).
2. The colour site lib was swapped to its traced version this round, so s23, s24 and s25 (84–110.5) must be checked for regressions too (every 1 s).
3. List every remaining visible problem ranked by visibility: seams/pops at cuts, character likeness (designer, owl), the owl's design consistency across s26→s27→s40, doubled/ghosted drawings, flat or blobby areas, colour/light, timing, anything broken. In "segment" give exactly one responsible id (s23…s28, s40) or "hippie" for the shared colour-site lib, or "global" for src/main.js / src/lib/post.js.`, { label: 'ending critic', phase: 'Ending critic', schema: CRIT_SCHEMA })

// ---------------- Targeted fixes ----------------
phase('Targeted fix')
const OWNED = { s23: 'src/shots/s23.js (+ src/shots/s23/)', s24: 'src/shots/s24.js (+ src/shots/s24/)', s25: 'src/shots/s25.js (+ src/shots/s25/)', s26: SHOT.s26.file, s27: SHOT.s27.file, s28: SHOT.s28.file, hippie: 'src/lib/hippie.js and docs/hippie.md' }
const bySeg = {}
for (const it of (critic && critic.issues) || []) { const k = (it.segment || '').trim(); if (OWNED[k]) (bySeg[k] = bySeg[k] || []).push(it) }
const targets = Object.keys(bySeg).filter((k) => bySeg[k].some((i) => i.severity !== 'low') || bySeg[k].length >= 2)
log(`Critic: ${((critic && critic.issues) || []).length} issues; targeted fixes on ${targets.join(', ') || 'none'}`)
// the shared lib first, then shots (shots may depend on its fix)
const libFix = targets.includes('hippie') ? await agent(`${COMMON}

YOUR JOB: TARGETED FIX on the shared colour-site lib. You own src/lib/hippie.js and docs/hippie.md only. The ending critic flagged:
${JSON.stringify(bySeg.hippie, null, 1)}
Fix them without breaking any dependent shot (s23–s27): verify each with tools/compare.sh at its page-visible times (snapshots/end-hippie-tfix*). Return what you fixed and what remains.`, { label: 'tfix:hippie', phase: 'Targeted fix', schema: FIX_SCHEMA }) : null
const shotFixes = await pipeline(targets.filter((k) => k !== 'hippie'), (id) => agent(`${COMMON}

YOUR JOB: TARGETED FIX on ${id}. You own ${OWNED[id]} and fidelity/${id}.md. Shot timing is fixed in src/shots/index.js PLAN. The ending critic flagged:
${JSON.stringify(bySeg[id], null, 1)}
Fix them (check neighbour shots' frames at your cuts), without regressing the rest of the shot. Verify in snapshots/end-${id}-tfix*. Return what you fixed (before→after numbers) and what remains.`, { label: `tfix:${id}`, phase: 'Targeted fix', schema: FIX_SCHEMA }))

return {
  hippie: hippie ? { status: hippie.status, results: hippie.results, owner_actions: hippie.owner_actions } : null,
  s26: c26 ? { final: c26.fix3 && c26.fix3.status, remaining: c26.fix3 && c26.fix3.remaining, rev2: c26.rev2 && c26.rev2.fidelity } : null,
  s27: c27 ? { restore: c27.restore && c27.restore.metrics, final: c27.fix && c27.fix.status, remaining: c27.fix && c27.fix.remaining } : null,
  s28: c28 ? { restore: c28.restore && c28.restore.metrics, final: c28.fix && c28.fix.status, remaining: c28.fix && c28.fix.remaining } : null,
  critic,
  libFix: libFix && { fixed: libFix.fixed, remaining: libFix.remaining },
  shotFixes: shotFixes.filter(Boolean).map((f) => ({ id: f.id, status: f.status, fixed: f.fixed, remaining: f.remaining, metrics: f.metrics })),
}
