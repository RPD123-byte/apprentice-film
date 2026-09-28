# process/ — the agent workflows that built the film

Every shot in this repository was written by Claude (Opus 5.5) agents, coordinated by the workflow scripts in this
folder. A workflow script is plain JavaScript run by Claude Code's workflow runner: it starts agents with
`agent(prompt, { label, phase, schema })`, fans them out with `parallel(...)` / `pipeline(...)`, and collects each
agent's structured result (the JSON `schema` it had to return). **The prompts inside the scripts are exactly what each
agent was asked to do**, so they are the best record of how the work was divided and what rules every agent followed.

The scripts are kept as they ran. They are not standalone Node programs: they need Claude Code's workflow tool, and
the `ROOT` / `SRC` constants at the top point at the author's machine (the project folder and the source film, which is
not part of this repository).

## The runs, in order

| # | script | what it did | agents | result |
|---|---|---|---|---|
| — | *(no script)* | An interactive session set up the project: the composition, `STYLE.md` (the brief every agent reads, now [`docs/STYLE.md`](../docs/STYLE.md)), the measuring and comparison tools in `tools/`, the engraving engine, and the first versions of s01, s12 and s40. | — | Its scratch scripts are in `tracing/*/scratch-build/` (they came from that session's scratchpad). |
| 1 | [`1-build.js`](1-build.js) (was `tools/workflows/build.js`) | **apprentice-film-build.** Foundations first — F1 the sōko page, F2 the colour site, F3 the “Pure Imagination” page + note card (and shot s08), F4 the owl kit (and shots s09, s12), F5 the sound design. Then one pipeline per segment: **build → review #1 → fix #1 → review #2 → fix #2**, and a whole-film continuity critic at the end. s01 and s40 already existed and got the review/fix passes only. | 131 started (74 finished) | Ran ~22 h, 36.5 M tokens, 19,056 tool calls. It hit the account's weekly usage limit part-way: 57 agents (most review #2 / fix #2 passes and the continuity critic) failed with “You've hit your weekly limit”. |
| 2 | [`2-continue.js`](2-continue.js) + [`2-continue.args.json`](2-continue.args.json) | **apprentice-film-continue.** Picks up where run 1 stopped: for each segment, the steps still missing (listed in the args file, with where the interrupted agent had got to), then the continuity critic and one continuity-fix agent per flagged segment. The fix agents read the earlier reviews from [`2-continue-inputs/`](2-continue-inputs/) (review #1 and, where it existed, review #2 of each segment, as saved from run 1; the script expects them at `snapshots/wf2-inputs/`). | 55 | All 54 fix/review agents finished (~9.6 h, 20.6 M tokens, 8,576 tool calls); the run was stopped while the continuity critic was still working, so the continuity-fix phase never ran. |
| 3 | [`3-ending.js`](3-ending.js) | **apprentice-ending.** The colour ending (s26–s28) looked worse than the rest of the film. With the user's approval to use traced geometry there, it restored the traced colour site (`src/lib/hippie.js`) and the traced s28 and s27 builds from `archive/prev-builds/` (now `tracing/<shot>/prev-builds-*/`), gave s26 a deep fix, ran review/fix chains on s26–s28, then an ending critic over 97–140.8 s and targeted fixes on the shots it flagged (s23, s24, s25, s27). | 17 | Completed (~14.6 h, 6.7 M tokens, 3,909 tool calls). Its logs: “Chains done: s26 close, s27 close, s28 close”, “Critic: 11 issues; targeted fixes on s25, s27, s24, s23”. |
| 4 | [`4-repo-cleanup.js`](4-repo-cleanup.js) | **apprentice-repo-cleanup.** Packaged the workspace as this repository: collected every tracing / measurement / verification script into `tracing/` and these workflows into `process/`, sorted out font licensing, and restructured the tree with a README. It does not change how the film looks. | — | This is the run that produced the current layout. |

[`disk-guard.sh`](disk-guard.sh) (was `tools/disk-guard.sh`) ran beside run 1: every 5 minutes it deleted that run's older
scratch images and videos in `snapshots/` when the disk had less than 80 GB free. Like the workflows, it is kept as it ran
(author paths included).

Agent labels such as `build:s14`, `review1:s14`, `fix2:s14`, `F:owl`, `F5 sound design`, `restore:s28`, `deepfix:s26`,
`tfix:s27`, `ending critic` appear throughout the fidelity logs and were used to sort the agents' scratch scripts into
the right shot folder in `tracing/`.

## Rules every agent was given

The shared preamble (`COMMON` in each script) is the contract that shaped the code in `src/`:

- **Everything on screen is drawn by code.** No frame, crop or pixel of the source film (or any image file) may be loaded
  or embedded. The source is used only to measure (positions, timing, camera moves, tone) and to compare against.
  For the colour ending the user later approved *traced geometry* — vector traces of source frames stored as numbers
  and painted by code (run 3).
- **Deterministic drawing**: `draw(ctx, local, t)` must be a pure function of time (no `Math.random`, `Date`, state
  carried between frames), because frames render out of order in several browser workers.
- **Ownership**: each agent writes only the files it owns (its shot module, its `src/shots/<id>/` helpers, its
  `fidelity/<id>.md`, now `docs/fidelity/`) and its own `snapshots/<id>*` output folders; shared libraries are read-only to everyone else.
- **Measure, then compare**: study the source with `tools/strip.py`, `tools/grid.py`, `tools/camtrack.py`; iterate with
  `tools/compare.sh` (render | source pairs) and `tools/sidebyside.sh` (motion sheets) until the render matches.
- **Report honestly** in `fidelity/<id>.md` (now [`docs/fidelity/`](../docs/fidelity/)) — never overstate fidelity.
- The designer and the owl are the user's own characters; no third-party logos, well-known characters, song lyrics or
  other copyrighted text on screen.

## Things the prompts mention that are not in this repository

The prompts point agents at files from the original film's own production, on the author's machine. They were read
for reference only and are not redistributed here:

- the source film itself (`01-13-FINISHED-v3-share.mp4`, 2206×946, 25 fps, 140.8 s);
- the original finishing pass (`clips/finish/finish2.py`, `finish/track2.json`), which `src/lib/post.js` reproduces;
- the original sound brief (`animatic2/cue_sheet.tsv`) and audio-fix scripts (`clips/audiofix/*.py`), context for the
  F5 sound agent, which analysed the source audio and then synthesized its own score (`tools/sound/`);
- the colour site's layout reference (`hippie/hero219.html`) and the per-shot prompt texts (`clips/p_*.txt`).
