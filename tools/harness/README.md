# tools/harness — frame-exact renders of the live composition

Small Node scripts that open the real film (`index.html` → `src/main.js`) in headless Chrome and call
`window.__film.renderAt(t)` directly. Unlike `hyperframes snapshot` (used by `tools/compare.sh`), they set no
per-call protocol timeout, so they keep working when loading every shot takes a while.

| script | what it does |
|---|---|
| `shoot.mjs OUTDIR TIMES [entry.html]` | Saves the graded frame at each time as `OUTDIR/<frame>.png` (`frame = round(t × 25)`). `TIMES` is `12.5,13,14.25` or a range `T0:T1` (every frame). |
| `probe.mjs T0 T1` | Renders every frame from T0 to T1 in one page and logs each WebGL context the shots create (with the line of code that made it) and the first frame where the grade's context is lost. Exit code 1 if it was lost. This is how the black frames of multi-worker renders were traced (see the README's rendering notes). |
| `deps.mjs T0 T1 [out.txt]` | Lists every repository file the page requests while rendering T0..T1, and any path that 404s. `node tools/harness/deps.mjs 0 140.76` lists the 627 files the film needs. |
| `film.mjs` | Shared code: finds Chrome, serves the repository by request interception (no server), waits for `window.__film`. |

```sh
npm install                                     # once: puppeteer-core (a devDependency)
node tools/harness/shoot.mjs snapshots/stills 3,50,120,138
node tools/harness/probe.mjs 0 140.76
```

**Chrome.** `$HYPERFRAMES_BROWSER_PATH` (or `$CHROME`) if set, otherwise the newest `chrome-headless-shell` in
HyperFrames' cache (`~/.cache/hyperframes/chrome/`) or puppeteer's (`~/.cache/puppeteer/`).
`npx --yes hyperframes@0.8.69 browser ensure` downloads one; `scripts/setup.sh` runs it.

**GPU.** On macOS the page uses ANGLE on Metal, as the film's renders did. Elsewhere it uses SwiftShader (software)
unless `HARNESS_GPU=hardware`; `HARNESS_GPU=software` forces SwiftShader everywhere.

**Network.** The page loads GSAP 3.14.2 from jsDelivr, so the first load needs internet access. The score
(`audio/score.wav`) is deliberately answered with a 404 (pictures only), which shows up as one console error.

`s28` has a debug overlay: `S28_DBG='{…}' node tools/harness/shoot.mjs …` sets `window.__s28dbg` before rendering.

These are clean copies of the harnesses the agents used (`tracing/render/snapshots-gpu-diag/probe.mjs`, `deps.mjs`
and `tracing/render/snapshots-end-critic/tools/shoot.mjs`), without the author-machine paths.
