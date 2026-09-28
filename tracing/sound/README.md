# sound

F5 — the soundtrack. Nothing of the source's audio is in the film: the source track was only *analysed*, the findings
were written down as numbers in a cue table, and `audio/score.wav` is synthesized from that table.

The code for this is not in `tracing/` because it is still a runnable part of the repository: **`tools/sound/`**.

Analysis (read the source track, print or plot measurements — nothing from it is mixed in):

- `analyze.py` — 50 ms RMS loudness envelope per channel and onset strength.
- `events.py` — onset table: time, strength, 20 ms peak level, bed level before it, attack band split, centroid, pan.
- `bands.py` — octave-band floor levels per time range (room tone, hum).
- `drones.py` — steady tonal components per range (median CQT peaks).
- `multipitch.py`, `notes_at.py`, `contour.py`, `pianoroll.py` — pitch analysis for the music and voiced events.
- `zoom.py` — spectrogram contact sheets of short windows.

From measurements to sound:

- `cues.py` — **the cue table**: every time and level in it was measured on the source with the tools above.
- `kinds.py`, `sfx.py`, `music.py`, `dsp.py` — deterministic synthesis (seeded noise, oscillators, modal /
  additive instruments, reverb); no samples.
- `score.py` — renders `audio/score.wav` (48 kHz stereo, exactly 140.8 s) and writes `audio/CUES.md`.
- `calibrate.py` (+ `*_cal.json`) — nudges cue levels so the mix's loudness tracks the source; `verify.py` — plots
  source vs score envelopes and spectrograms.

See `docs/audio.md` for how to regenerate and what matches. An earlier (23 Sep) state of the same folder is preserved
inside the project copy at `tracing/render/scratch-build-exact/tools/sound/`. The analysis outputs the sound agent wrote
(`snapshots/audio-work/`: extracted source audio, `.npz` envelopes, spectrogram PNGs, `v1…v13/report.txt` verification
reports) are data and are not included (see `../NOT_INCLUDED.tsv`).
