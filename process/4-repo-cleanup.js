export const meta = {
  name: 'apprentice-repo-cleanup',
  description: 'Turn the apprentice-film workspace into a clean, complete, runnable public repo: collect every generation script, sort font licensing, restructure with a README',
  phases: [
    { title: 'Collect', detail: 'every generation/tracing script from repo, snapshots/ and scratch folders into tracing/ + process/; font licensing' },
    { title: 'Restructure', detail: 'clean tip layout, runnable tools, setup script, README — runtime files untouched' },
  ],
}

const ROOT = '/Users/computer/rootline/apprentice-film'
const SCR = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
const COMMON = `Project: ${ROOT} — a 140.8 s short film rebuilt entirely in code (HyperFrames composition: index.html → src/main.js → src/shots/*.js drawing every frame on Canvas2D/WebGL, a WebGL grade in src/lib/post.js, and a soundtrack synthesized by tools/sound/score.py into audio/score.wav). It is the user's own film; it is about to become a PUBLIC GitHub repo that a stranger must be able to read and run to recreate the video.
It is a git repo on branch main. Do NOT run git commands that change history or the index (no add/commit/rm/mv/checkout/reset/push) — use plain filesystem operations; the orchestrator commits. Read-only git (ls-files, log, show) is fine.
HARD RULE: the 627 files the render actually loads are listed in ${SCR}/runtime_files.txt with their sha256 in ${SCR}/runtime_sha256.txt. Never modify, move or delete any of them (index.html, src/main.js, src/config.js, the listed src/lib and src/shots files, assets/fonts/*, audio/score.wav). Before you finish, re-run \`shasum -a 256\` over that list and confirm every hash is unchanged.
Never put secrets, tokens or API keys into the repo; if you meet one in a script you copy, replace it with an environment-variable read and report it.`

phase('Collect')
const COLLECT_SCHEMA = { type: 'object', properties: {
  copied: { type: 'integer' }, skipped_duplicates: { type: 'integer' }, skipped_data: { type: 'integer' },
  groups: { type: 'array', items: { type: 'string' } }, secrets_found: { type: 'array', items: { type: 'string' } },
  notes: { type: 'string' } }, required: ['copied', 'groups', 'secrets_found', 'notes'] }
const collectP = agent(`${COMMON}

YOUR JOB: collect EVERY piece of code that was used to measure, trace, generate or verify this film — none may be missed — into a new, well-organised top-level folder ${ROOT}/tracing/ (provenance code: how the data in src/shots was produced), plus ${ROOT}/process/ (the agent-orchestration workflow scripts). You own only tracing/ and process/ — create them; do not touch anything else.
Sources to sweep (code = .py .mjs .cjs .js .ts .sh .html .ipynb, plus small config .json/.txt that a script reads as INPUT settings):
1. Tracked in the repo but NOT loaded by the render: every such file under src/ (list: ${SCR}/unused_src.txt — mostly per-shot trace/ fit/ measurement scripts, plus old unused builds), tools/trace-scripts/**, tools/*.html dev pages, archive/prev-builds/** (earlier shot builds).
2. Untracked: ${ROOT}/snapshots/** (44 GB of scratch — only code files; ~2,500 of them, many are the only copy of a tracing tool, e.g. snapshots/s28-tools/traceview.py, snapshots/f2k-tools/ungrade.py, snapshots/*-tools, *-harness, end-critic/tools, gpu-diag).
3. Agent scratch folders: /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad (the main build session — assume everything there belongs to this project unless it clearly doesn't), and ONLY the apprentice-related files (grep for apprentice / 01-13-FINISHED / renderAt / rootline / src/shots) in /private/tmp/claude-501/-Users-computer-vibe-check/{7f90967d-aef2-49c6-9989-2dae8cc3c639,c1839d39-6cfd-42fa-9c33-918736bbf888,9d8e3a22-605d-469a-804c-e2a05ae8a7e5}/scratchpad.
4. Orchestration workflows → process/: ${ROOT}/tools/workflows/build.js and /Users/computer/.claude/projects/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/workflows/scripts/*.js. Add process/README.md: these scripts drove the AI agents (build → review → fix per shot, the continuation, the ending pass); prompts inside show what each agent was asked.
Rules:
- Exclude node_modules, __pycache__, *.pyc, .venv, media (png/jpg/mp4/wav/npy/npz), and any file whose sha256 equals a runtime file.
- DATA vs CODE: a .js/.json that is essentially numbers (e.g. > 50 KB and > 45% digits) is a data OUTPUT, not code — do not copy it; count it and list the biggest ones in the index as "data outputs (not included)". Keep genuine code even if large.
- Dedupe by content hash: copy each distinct file once; record every other location it appeared in the index.
- Layout: tracing/<group>/<origin>/<original relative path>, where group is the shot id (s01…s28, s40) or foundation (soko = F1 page, hippie = F2 colour site, pureimg = F3, owl = F4 owl kit, sound = F5 audio analysis, render = render/verification harnesses, common = shared helpers) inferred from paths and contents; origin is a short name for where it came from (e.g. snapshots-s28-tools, src-s02-hand-trace, trace-scripts-f2k, scratch-build). Preserve relative paths inside an origin so script-to-script imports still resolve relative to each other.
- Do not rewrite the scripts' logic. They were run with absolute paths on the author's machine; leave them, but add a top-level tracing/README.md explaining that, and that they need the source film (path in env APPRENTICE_SOURCE) and intermediate frames they produced themselves.
- Write tracing/README.md: what this folder is (provenance: the scripts that measured the source film and produced the traced/measured data files in src/shots/*/data, keys, etc.); how the pipeline generally works per method (value studies + engraving, vector tracing via colour segmentation + ink extraction, rotoscoped keys + optical flow, camera tracking, audio analysis → cue table); then an INDEX per group: each origin folder, one line on what it does (read docstrings/header comments/main functions), and which src files it produced when you can tell (grep for output paths). Keep it navigable — a reader should find "how was s28's data made" in under a minute.
- Scan everything you copy for secrets (API keys, tokens, passwords, private keys) and report them.
Return counts, groups, secrets found (paths), and notes.`, { label: 'collect:tracing', phase: 'Collect', schema: COLLECT_SCHEMA })

const fontsP = agent(`${COMMON}

YOUR JOB: font licensing for a public repo. You own only ${ROOT}/assets/fonts/LICENSES.md (new) and ${ROOT}/scripts/fetch-fonts.sh (new) — do not edit or delete the font files themselves (they are runtime files).
1. For each file in assets/fonts/ (Archivo-Var.woff2, Fraunces-Variable.ttf, FrauncesSoft-Black.ttf, Geist-Var.woff2, GeistMono-Var.woff2, Poppins-500/600/700.woff2, Satoshi-Variable.woff2, Shrikhand.woff2): identify the family, foundry/copyright holder, upstream source URL and license, using the font's own name/license tables (python fontTools if available: name IDs 0, 13, 14) and the upstream project pages (WebFetch). For FrauncesSoft-Black.ttf find out what it is (an instance of Fraunces with the SOFT axis? who made it — check its name table and grep the repo/snapshots for how it was created).
2. Decide per font whether it may be redistributed in a public git repo. OFL-1.1 fonts may, with their copyright notice + license text. Satoshi comes from Fontshare (Indian Type Foundry, ITF Free Font License) — read the actual license text and decide; if redistribution of the font file is not allowed, the repo must not contain it: report that clearly, and write scripts/fetch-fonts.sh that downloads it from the official source into assets/fonts/Satoshi-Variable.woff2 at setup (idempotent, verifies the file afterwards; find the working official download URL and test the script into a temp dir — do not overwrite the existing file). Same treatment for any other non-redistributable font.
3. Write assets/fonts/LICENSES.md: a table (file, family, copyright holder, license, source URL, redistributable?) plus the full OFL-1.1 text once, with each OFL family's copyright line.
Return what you found, which files must NOT be committed, and the tested fetch command.`, { label: 'fonts:licensing', phase: 'Collect', schema: { type: 'object', properties: {
  fonts: { type: 'string' }, do_not_commit: { type: 'array', items: { type: 'string' } }, fetch_script_tested: { type: 'boolean' }, notes: { type: 'string' } }, required: ['fonts', 'do_not_commit', 'fetch_script_tested'] } })

const [collect, fonts] = await parallel([() => collectP, () => fontsP])
log(`Collected ${collect ? collect.copied : '?'} scripts into tracing/; fonts not to commit: ${fonts ? fonts.do_not_commit.join(', ') || 'none' : '?'}`)

phase('Restructure')
const restructure = await agent(`${COMMON}

YOUR JOB: make the tip of main a clean, complete, runnable repo with a README a newcomer can follow. Two helpers already ran:
- Collector (tracing/ + process/ now hold every generation/tracing/verification script and the agent workflows): ${collect ? JSON.stringify({ copied: collect.copied, groups: collect.groups, secrets: collect.secrets_found, notes: collect.notes }) : 'FAILED — do not delete any code-bearing folder whose code is not verifiably present in tracing/'}
- Fonts: ${fonts ? JSON.stringify(fonts) : 'FAILED — keep all fonts, note licensing as unresolved in the README'}

Target layout (adjust names only if you have a strong reason; explain in the README):
  README.md · package.json · index.html · hyperframes.json · meta.json · .gitignore
  src/ (ONLY the runtime files) · assets/fonts/ (+ LICENSES.md) · audio/score.wav (generated, committed for convenience)
  tools/ — runnable tools only: sound/ (score generator: score.py, cues.py, sfx.py, kinds.py, music.py, dsp.py, *_cal.json, plus its analysis/verify scripts), verify_render.py, compare.sh, sidebyside.sh, refframe.sh, grid.py, strip.py, camtrack.py, film_sidebyside.sh, ending_compare.sh, fidelity_log.py, requirements.txt, and harness/ (the frame-exact renderer: a clean copy of snapshots/gpu-diag/probe.mjs + deps.mjs and snapshots/end-critic/tools/shoot.mjs, fixed to find puppeteer-core and Chrome without author-machine paths — e.g. puppeteer-core as a devDependency and the Chrome path from an env var or hyperframes' cache, documented)
  scripts/setup.sh (+ scripts/fetch-fonts.sh from the fonts helper) — checks Node ≥ 18, ffmpeg, Python 3.11 + tools/requirements.txt, fetches non-redistributable fonts, and (optionally, given APPRENTICE_SOURCE=path/to/original.mp4) links comparison/media/ with RELATIVE/portable links
  comparison/ — the stacked comparison project (keep index.html, package.json, hyperframes.json, meta.json, assets/, .gitignore; its media/ links are created by setup, not committed; its render script must write renders/opus-5.5-vs-original-seedance.mp4)
  docs/ — STYLE.md (the method brief), FIDELITY.md + fidelity/*.md (per-shot logs), audio.md, soko.md, hippie.md, owl.md, pureimg.md; update tools/fidelity_log.py and any doc links for the new paths
  tracing/ and process/ — as the collector left them
Remove from the tip (all of it stays in git history): every src/ file NOT in runtime_files.txt (after confirming its code is in tracing/ — the collector's index or a hash match; if something is missing, copy it into tracing/misc/ first), archive/, tools/trace-scripts/, tools/workflows/ (now in process/), tools/*.html dev pages (now in tracing/), AGENTS.md, CLAUDE.md, .claude/, root STYLE.md/FIDELITY.md/fidelity/ (moved to docs/), and any font file the fonts helper says must not be committed (add it to .gitignore instead — the render still needs it locally, so do NOT delete it from disk: only make git ignore it).
Make everything a user runs portable: no /Users/computer or /private/tmp paths in package.json, scripts/, tools/ (except tools/sound analysis tools may default the source path to env APPRENTICE_SOURCE), comparison/. The source film is referenced only through env APPRENTICE_SOURCE (tools default REF to it). tools/sound/score.py must write audio/score.wav relative to the repo.
package.json scripts: setup, score (regenerate audio/score.wav), render (the existing pinned single-worker command, output renders/film.mp4), check, verify (python3 tools/verify_render.py renders/film.mp4 [old]), compare (build + render the comparison), fidelity (regenerate docs/FIDELITY.md). Keep the hyperframes@0.8.69 pin.
Update .gitignore (node_modules, renders, snapshots, comparison/media, comparison/renders, __pycache__, .DS_Store, non-redistributable fonts).
Write README.md for a newcomer: what this is (the film rebuilt frame-for-frame in code by Claude Opus 5.5 agents; nothing from the source film is embedded — every frame is drawn by code, the soundtrack synthesized; traced geometry stored as numbers for some shots; the stacked comparison video); requirements; quickstart (setup → render → verify; regenerate the score; build the comparison video with your copy of the original); how it works (the clock → renderAt → shot table in src/shots/index.js → each shot's draw(ctx, local, t) → src/lib/post.js grade; determinism rules; the shot module contract; shared libs); a repo map; a shot table (id, time span, what happens, method drawn/traced/mixed, fidelity close/approx — from docs/FIDELITY.md) with a pointer to each shot's file; "how the data was made" (tracing/ and its README); "how it was built" (process/ — AI agent workflows); rendering notes (render with ONE worker: several GPU workers lost WebGL contexts and produced black frames; ~15 min on an M4 Max; tools/verify_render.py gates a render); known gaps (weakest shots s15, s20, s25 per verify numbers: s15 21.4, s20 21.8, s25 12.9 mean blurred diff vs source; ending s26–s28 4–7); licenses (fonts per LICENSES.md; GSAP loaded from jsDelivr, pinned 3.14.2); and a note that the full working history (every intermediate build, snapshots excluded) is in git history before this commit. Keep it clear and skimmable; no marketing tone.
Before finishing: (1) re-verify all 627 runtime hashes are unchanged; (2) run \`npx --yes hyperframes@0.8.69 check\` in the repo and in comparison/ (report results; the root check's runtime step may time out on the heavy load — that is a known issue, lint must be clean); (3) run \`python3 tools/fidelity_log.py\` and a dry \`bash -n\` / \`node --check\` / \`python3 -m py_compile\` over every file in tools/ and scripts/; (4) grep the tip (excluding tracing/ and process/) for /Users/ and /private/ and report any left; (5) list the final top-level tree with sizes. Return a summary.`, { label: 'restructure', phase: 'Restructure', schema: { type: 'object', properties: {
  removed: { type: 'array', items: { type: 'string' } }, moved: { type: 'array', items: { type: 'string' } }, added: { type: 'array', items: { type: 'string' } },
  runtime_hashes_unchanged: { type: 'boolean' }, checks: { type: 'string' }, leftover_abs_paths: { type: 'array', items: { type: 'string' } }, tree: { type: 'string' }, notes: { type: 'string' } },
  required: ['removed', 'moved', 'added', 'runtime_hashes_unchanged', 'checks', 'leftover_abs_paths', 'tree'] } })

return { collect, fonts, restructure }
