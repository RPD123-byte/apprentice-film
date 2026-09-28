export const meta = {
  name: 'apprentice-film-continue',
  description: 'Finish the interrupted film rebuild: remaining fix/review passes per segment, then a whole-film continuity critic and continuity fixes',
  phases: [
    { title: 'Fix', detail: 'finish fix #1 where the last run was cut off, then fix #2 on every segment' },
    { title: 'Review', detail: 'adversarial review #2 of each segment\'s current state' },
    { title: 'Continuity', detail: 'whole-film boundary, gap and grade check' },
    { title: 'Continuity fix', detail: 'one agent per segment the critic flags' },
  ],
}

const ROOT = '/Users/computer/rootline/apprentice-film'
const SRC = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
const INPUT = ROOT + '/snapshots/wf2-inputs'
const COMMON = `You are one of many agents rebuilding a 140.8 s illustrated short film entirely in code (HyperFrames composition, Canvas2D + WebGL), frame-for-frame against the source. The film is the user's own work.
Project: ${ROOT}. Source film: ${SRC} (2206x946, 25 fps).
FIRST read ${ROOT}/STYLE.md completely and follow it (architecture, shot contract, engraving engine, measuring tools, compare loop, ownership rules, fidelity log). Read the docs/*.md of the foundations your segment uses before touching code.
Hard rules: everything drawn by code (never load or embed any frame/crop/pixel of the source or any image file); deterministic draw (no Math.random/Date); write only files you own; use your own snapshots/<id>* output dirs; do not render the full film, touch git, or start servers. The designer and the owl are the user's own original characters — recreate them faithfully. Never draw any third-party logo, brand mark or well-known character, and never put song lyrics or other copyrighted text on screen; the "Pure Imagination" laptop page stays the existing original design.
Work in ${ROOT} (cd there for tools). Be exhaustive and precise: measure positions, timing and camera moves from the source; iterate with tools/compare.sh and tools/sidebyside.sh until the render matches as closely as you can make it. Report honestly — never overstate fidelity.
Context: the previous build run was cut off by a usage limit while agents were mid-edit. Work in small, verified increments: after each change make sure your shot still renders without an error bar, so an interruption never leaves it broken, and keep fidelity/<id>.md current as you go. When you finish, delete your own intermediate snapshot folders/images for this pass (keep only your final comparison folder) — disk space is limited.`

const FIX_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, status: { type: 'string', enum: ['close', 'approx', 'simplified', 'cut'] },
  fixed: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'string' } } }, required: ['id', 'status', 'fixed', 'remaining'] }
const REVIEW_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, fidelity: { type: 'string', enum: ['close', 'approx', 'simplified', 'cut', 'broken'] },
  defects: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['high', 'medium', 'low'] }, at: { type: 'string' }, what: { type: 'string' }, fix: { type: 'string' } },
    required: ['severity', 'at', 'what', 'fix'] } },
  deterministic: { type: 'boolean' }, errors_seen: { type: 'boolean' }, verdict: { type: 'string' } }, required: ['id', 'fidelity', 'defects', 'deterministic', 'errors_seen', 'verdict'] }

const fileOf = (id) => id === 's01' ? 'src/shots/s01_birdseye.js' : id === 's40' ? 'src/shots/s40_endcard.js' : `src/shots/${id}.js`
const planLine = (id) => `Your segment's timing is fixed in src/shots/index.js PLAN (id ${id}).`
const depsLine = (s) => `Shared foundations this segment uses (read-only; see their docs): ${s.deps.map((d) => `docs/${d}.md`).join(', ')}.`
const fmtReview = (r) => JSON.stringify({ fidelity: r.fidelity, defects: r.defects, deterministic: r.deterministic, errors_seen: r.errors_seen, verdict: r.verdict }, null, 1)

function reviewPrompt(s, round, priorRef) {
  return `${COMMON}

YOUR JOB: adversarial REVIEW #${round} of segment ${s.id} (${fileOf(s.id)}). You did not build it; your job is to find everything that differs from the source, harshly and specifically. Do not edit any source files. Use snapshots/${s.id}-rev${round}* for output.
1. Render dense comparisons: tools/compare.sh at every 0.25–0.5 s across the segment plus the first frame (start+0.02) and last frame (end-0.02), and tools/sidebyside.sh over the whole segment at 5–10 fps for motion. Read the pair images and sheets carefully.
2. Check: every action/beat present at the same time (±2 frames at cuts and key moments); framing/composition and camera moves (measure with tools/camtrack.py on the source if in doubt); tone/light (too bright/grey vs deep black; colour accuracy in colour shots); line quality (moiré, boiling between frames, mechanical hatching on characters); character likeness and silhouettes; missing objects; text/UI; boundary continuity with neighbouring segments (render the frames just before start and just after end); placeholder text or red error bars.
3. Determinism: render the same timestamp in two separate compare runs and diff the frame PNGs with python (must be identical or near-identical).
${priorRef}
Return defects ranked most visible first, each with a concrete, actionable fix (coordinates, times, values). Rate fidelity honestly.`
}

function fixPrompt(s, round, reviewText) {
  const note = (round === 1 && s.interrupted) || (round === 2 && s.interrupted === 'fix #2')
    ? `\nNOTE: an earlier ${s.interrupted} agent on this segment was cut off mid-work. Some of the defects below may already be partly addressed, and its helper files may hold half-finished changes. Start by rendering the current state (tools/compare.sh across the segment) and reading your files; then work from what is actually on screen now.\n`
    : ''
  return `${COMMON}

YOUR JOB: FIX pass #${round} on segment ${s.id}. You own ${fileOf(s.id)} (and src/shots/${s.id}/ helpers, fidelity/${s.id}.md). ${planLine(s.id)} ${depsLine(s)}
${note}An independent reviewer compared it to the source and found:
${reviewText}
Fix every high and medium defect you can, then low ones, verifying each with tools/compare.sh / tools/sidebyside.sh (dirs snapshots/${s.id}-fix${round}*). Measure from the source rather than guessing. Keep draw deterministic and ≤ ~300 ms/frame. Update fidelity/${s.id}.md honestly (status + remaining gaps; first line is the table row). Return what you fixed and what remains.`
}

const SEGS = args
log(`Continuing ${SEGS.length} segments: ` + SEGS.map((s) => `${s.id}[${s.steps.join('>')}]`).join(' '))

const segs = await pipeline(SEGS, async (s) => {
  const out = { id: s.id }
  if (s.steps.includes('fix1')) {
    out.fix1 = await agent(fixPrompt(s, 1, `(review #1 — read it in full from ${INPUT}/${s.id}-rev1.json)`), { label: `fix1:${s.id}`, phase: 'Fix', schema: FIX_SCHEMA })
    if (!out.fix1) log(`fix1:${s.id} returned nothing (failed or skipped)`)
  }
  if (s.steps.includes('review2')) {
    out.rev2 = await agent(reviewPrompt(s, 2, `Previous review #1 for comparison is at ${INPUT}/${s.id}-rev1.json — read it and check which items were fixed and what is still wrong.`), { label: `review2:${s.id}`, phase: 'Review', schema: REVIEW_SCHEMA })
    if (!out.rev2) log(`review2:${s.id} returned nothing (failed or skipped)`)
  }
  const rev2Text = out.rev2 ? fmtReview(out.rev2)
    : s.hasRev2 ? `(review #2 — read it in full from ${INPUT}/${s.id}-rev2.json)`
    : `(review #2 unavailable — do your own thorough side-by-side comparison against the source first; review #1 is at ${INPUT}/${s.id}-rev1.json for reference)`
  out.fix2 = await agent(fixPrompt(s, 2, rev2Text), { label: `fix2:${s.id}`, phase: 'Fix', schema: FIX_SCHEMA })
  if (!out.fix2) log(`fix2:${s.id} returned nothing (failed or skipped)`)
  return out
})

// ---------------- whole-film continuity (needs every segment finished) ----------------
phase('Continuity')
const CONT_SCHEMA = { type: 'object', properties: {
  issues: { type: 'array', items: { type: 'object', properties: { at: { type: 'string' }, segment: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, what: { type: 'string' }, fix: { type: 'string' } }, required: ['at', 'segment', 'severity', 'what', 'fix'] } },
  summary: { type: 'string' } }, required: ['issues', 'summary'] }
const continuity = await agent(`${COMMON}

YOUR JOB: whole-film CONTINUITY CRITIC. Do not edit files. Use snapshots/continuity*.
Render comparisons of the entire film: tools/compare.sh at every 1.0 s from 0.5 to 140.5 (split into batches of ~20 times), plus every segment boundary in src/shots/index.js PLAN at boundary-0.04 and boundary+0.04. Read everything.
Report: any placeholder ("not built yet") or red error bar; any segment whose framing/tone/timing clearly departs from the source; hard cuts landing on the wrong frame; jumps in continuity across boundaries (the owl or designer changing design or position between adjacent shots where the source is continuous); dissolves/flashes missing; the global grade looking wrong anywhere. Rank by visibility with exact times. In "segment" give exactly one responsible segment id from PLAN (s01…s28, s40); use "global" only for problems in src/main.js or src/lib/post.js (the grade, dissolve mechanics, the final fade).`, { label: 'continuity critic', phase: 'Continuity', schema: CONT_SCHEMA })

const KNOWN = new Set(['s01', 's40', ...SEGS.map((s) => s.id)])
const bySeg = {}
for (const it of (continuity && continuity.issues) || []) {
  const id = (it.segment || '').trim()
  if (!KNOWN.has(id)) continue
  ;(bySeg[id] = bySeg[id] || []).push(it)
}
const globalIssues = ((continuity && continuity.issues) || []).filter((it) => !KNOWN.has((it.segment || '').trim()))
const targets = Object.keys(bySeg).filter((id) => bySeg[id].some((i) => i.severity !== 'low') || bySeg[id].length >= 2)
log(`Continuity: ${(continuity && continuity.issues || []).length} issues; fixing ${targets.join(', ') || 'none'}; ${globalIssues.length} global issue(s) left for the main session`)

phase('Continuity fix')
const segById = Object.fromEntries(SEGS.map((s) => [s.id, s]))
const contFixes = await pipeline(targets, (id) => {
  const s = segById[id] || { id, deps: ['owl'], interrupted: null }
  return agent(`${COMMON}

YOUR JOB: CONTINUITY FIX on segment ${id}. You own ${fileOf(id)} (and src/shots/${id}/ helpers, fidelity/${id}.md). ${planLine(id)} ${depsLine(s)}
A whole-film continuity critic compared the film with the source and flagged these problems for your segment:
${JSON.stringify(bySeg[id], null, 1)}
Fix them (check the neighbouring segments' first/last frames with tools/compare.sh so boundaries now line up with the source), without regressing the rest of the shot. Verify in snapshots/${id}-cont*. Update fidelity/${id}.md. Return what you fixed and what remains.`, { label: `cont-fix:${id}`, phase: 'Continuity fix', schema: FIX_SCHEMA })
})

return {
  segments: segs.filter(Boolean).map((o) => ({ id: o.id,
    fix1: o.fix1 ? o.fix1.status : undefined, rev2: o.rev2 ? o.rev2.fidelity : undefined,
    final: o.fix2 ? o.fix2.status : null, remaining: o.fix2 ? o.fix2.remaining : null })),
  continuity: continuity ? { summary: continuity.summary, issues: continuity.issues } : null,
  globalIssues,
  contFixes: contFixes.filter(Boolean).map((f) => ({ id: f.id, status: f.status, fixed: f.fixed, remaining: f.remaining })),
}
