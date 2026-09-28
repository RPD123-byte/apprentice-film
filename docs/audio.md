# Soundtrack (foundation F5)

`audio/score.wav` is 48 kHz, stereo, 24-bit and exactly 140.800 s (6,758,400 frames). Every sample in it is synthesized
by the Python generator in `tools/sound/`. No sample of the source film's audio is copied, filtered or resynthesized
into it. The source track was only **analysed**: onset times, 20 ms peak levels, octave-band room-tone levels,
pitches and chords. Those measurements were written down as numbers in the cue table (`tools/sound/cues.py`), and the
generator reads only that table.

The timed cue list is in `audio/CUES.md`. `tools/sound/score.py` (`npm run score`) rewrites it from the cue table each
time it runs. Rendering the film only reads the committed `audio/score.wav` and regenerates neither file.

## Regenerate

```sh
# from the repository root
python3 tools/sound/score.py                  # writes audio/score.wav + audio/CUES.md (about 25 s); npm run score
python3 tools/sound/score.py --out X.wav --stems DIR   # render elsewhere and also write bed/drones/events/music stems
```

Requirements: Python 3.11 with numpy, scipy, soundfile and numba (librosa and matplotlib are needed only for the
analysis and verification tools); `tools/requirements.txt` pins the versions used. The render is deterministic: every
noise source is seeded, and two renders are bit-identical (same md5); with the pinned versions it reproduces the
committed `audio/score.wav` exactly.

### Verify against the source (analysis only)

```sh
export APPRENTICE_SOURCE=/path/to/original.mp4   # your copy of the source film (not in this repository)
# verify.py / calibrate.py extract its audio once to snapshots/audio-work/src.wav:
#   ffmpeg -i "$APPRENTICE_SOURCE" -vn -acodec pcm_f32le -ar 48000 snapshots/audio-work/src.wav
python3 tools/sound/verify.py                 # -> snapshots/audio-work/verify/{report.txt, env.png, overview.png, spec_<shot>.png}
python3 tools/sound/calibrate.py X.wav        # optional: re-measure the mix and update the *_cal.json trims (run 2-3x)
```

## How it is built

| file | role |
|---|---|
| `cues.py` | The cue table: sections, room-tone keyframes (10 octave bands), tonal drones, thin whines, about 570 timed events, and the colour-section chords. |
| `score.py` | Mixer and renderer: room-tone bed, drones, events (placement, panning, reverb send), music, room/hall reverb, final fade, and `CUES.md`. |
| `sfx.py`, `kinds.py` | Sound objects. Clicks and keys are modal resonators excited by noise bursts. Thuds use a pitch-dropping membrane plus box modes. Booms, whooshes and wingbeats are noise through time-varying state-variable filters. Owl calls are harmonic glides through formant resonators. Snips are a blade scrape plus damped metal modes. The shing is inharmonic steel-bar modes. The rest are crackle, tear, glass shards, electric storm, bell and birdsong. |
| `music.py` | Instruments: a felt piano (stiff-string partials, detuned string pairs, hammer, pedal and release), a detuned-saw pad, sub bass, triangle drones and a string shimmer. |
| `dsp.py` | Primitives: seeded noise, Butterworth, RBJ EQ, resonators, a numba state-variable filter, modal banks, Karplus-Strong, additive and FM synthesis, equal-power pan, and synthetic stereo room impulse responses. |
| `bed_cal.json`, `lvl_cal.json`, `music_cal.json` | Mix trims: per-keyframe band gains, per-event level offsets and per-chord gains. `calibrate.py` measured them by comparing a render with the source. They are scalar faders (a few hundred numbers), not audio. |
| `analyze.py`, `events.py`, `bands.py`, `drones.py`, `pianoroll.py`, `notes_at.py`, `multipitch.py`, `contour.py`, `zoom.py` | Analysis tools used to build the cue table: envelopes, onset tables, band floors, steady tones, CQT piano-rolls, chord and multi-pitch estimates, pYIN pitch contours, zoomed spectrograms. |
| `verify.py`, `calibrate.py` | Comparison and mix calibration. |

## What the analysis found (summary; details in CUES.md)

- **0-110 s, the black-and-white section, has no score.** It is close room tone (low fan rumble, an Eb/Bb hum around
  39/58 Hz), dark tonal drones that change at the cuts, and dense foley: trackpad clicks, a sub thud on the cut at
  6.07, a breath, a rising glassy cluster during the pan (11.5-14.5), the owl's 2.7 kHz tweet, claws, wingbeats every
  ~0.35 s, typing from 29.12 to 33.49 (54 keystrokes), a hit as the room drops away (33.63), squawks, running feet,
  corridor whooshes, the face-thump (45.76), a whip-crack into the flash (47.76), clusters struck on the synth keys
  (53.63-56.41, notes transcribed per strike), the crash, dings, dust, the scissors' shing (67.86, 2.75 kHz ring),
  snipping round the header, the pop (79.86), peel crackle, the flump (84.05), the THWUMP (88.47), a sigh, the hole in
  the sound, then IGNITE (92.64): a sub drop plus an electric storm of warbling partials and crackle. A freeze dropout
  at 97.58, the flash, shard tinkles, a big impact (103.13), then a stomping low pulse (~120 BPM, 3+3+2) under a G drone.
- **110.6 / 111.6:** two blow-out hits into colour.
- **Music, 114.87 to the end:** felt piano plus warm pad plus bass plus a high G/C/D shimmer, in F major / D minor
  at ~71 BPM (a chord every ~0.84 s). The 128.65-136.0 stretch is ~30 cents sharp. It ends on a C major 7 chord (136.1)
  that fades to silence at 140.62, with airy ribbon whooshes and three small ticks at 139.20/.27/.33 (the owl's eyes).
  Chords per onset: see CUES.md.

## How close it is (measured by `verify.py`, current render)

- **Loudness envelope:** 281 active 0.5 s windows. Mean |error| 1.53 dB, median 1.28 dB. 69 % within 2 dB, 86.5 %
  within 3 dB, 95.7 % within 4 dB, 100 % within 6 dB. Overall rms: source -27.03 dBFS, score -26.81 dBFS. The mean
  error per shot is at most 2.4 dB (s09, s19 and s21 are the worst).
- **Event timing:** 84.8 % of the strong source onsets have a score onset within 20 ms, 92.2 % within 40 ms and 97.4 %
  within 80 ms. Onset-envelope cross-correlation per shot gives lags between -11 and +8 ms. The strong source onsets
  still unmatched at 40 ms are at 25.21, 38.63, 38.79, 39.04, 40.76, 41.18, 43.03, 56.81, 64.91, 70.37, 70.69, 70.86,
  72.65, 96.75, 98.54, 99.27, 111.18 and 127.06. Most are in dense foley runs (patter, footsteps, the snip flurries),
  where the render hits a neighbouring onset instead of the exact one.
- **Spectra:** the per-shot source-vs-score spectrograms (`snapshots/audio-work/verify/spec_*.png`) read as the same
  sections: the same room-tone colour, the drones' pitches, the event types in the same places, and the music's
  chords, register and rhythm.

## What does not match

- **Timbre is approximate everywhere.** The source's foley and voices are recorded, organic sounds; these are physical
  models.
  - The owl's squawks and chirps have the measured pitch contours, but they sound synthetic: cleaner harmonics, a
    formant-filter colour.
  - The wingbeats and dust whumphs are simpler noise gestures than the source's layered feather sounds.
  - The typing has the same rhythm and level but a plainer, more uniform click than the real keyboard.
  - The blow-out hits and the storm are broadband noise designs. The source's versions have more structure: tonal
    debris, and a distorted synth chord with sliding partials. The electric storm is louder in the mids and more
    uniform than the source.
- **Music.** Chords, bass notes, timing and register are transcribed, and the per-chord levels are matched. But the
  instrument is a synthesized felt piano plus a saw pad, not the source's sampled piano and strings: attacks are less
  woody, and the decay and pedal behaviour are simplified. The inner voicings are estimates from multi-pitch
  analysis, so some inner notes are probably wrong. Melodic detail inside the chords (small runs, grace notes) is not
  transcribed.
- **The glassy rising cluster in the pan (11.5-14.5)** is quieter and less clearly pitched than the source's gliding
  partials.
- **Room tone** is shaped band-limited noise that follows the measured 10-band floors per keyframe. It lacks the
  source's fine hum harmonics and movement, which the drones only partly supply.
- **Stereo:** the source is nearly mono (L-R correlation 0.975). The score is 0.96. Measured pans are reproduced
  (thumps on the left at 76-78 s, right at 79 s, the whooshes at 86.6 and 100.2), but the source's small image
  details are not.
- **Levels come from calibration.** The last step of level matching is the automatic trims in the `*_cal.json` files.
  They are gains derived from source measurements, and they are why the envelope tracks so closely. The first
  uncalibrated render had a mean error of ~3.3 dB.
