#!/usr/bin/env python3
"""Steady tonal components per time range (ANALYSIS ONLY): median-over-time CQT (1/3-semitone bins), peaks above the
local spectral floor. Usage: tools/sound/drones.py in.wav "a-b,c-d,..." [topn=10]"""
import sys, numpy as np, soundfile as sf, librosa, scipy.signal as ss
path = sys.argv[1]; rngs = [tuple(map(float, r.split("-"))) for r in sys.argv[2].split(",")]
topn = int(sys.argv[3]) if len(sys.argv) > 3 else 10
info = sf.info(path); sr = info.samplerate
fmin = librosa.note_to_hz("C1")
for a, b in rngs:
    y, _ = sf.read(path, start=int(a * sr), stop=int(b * sr), always_2d=True)
    x = y.mean(1).astype(np.float32)
    C = np.abs(librosa.cqt(x, sr=sr, hop_length=1024, fmin=fmin, n_bins=36 * 7, bins_per_octave=36, filter_scale=2))
    M = 20 * np.log10(np.median(C, axis=1) + 1e-9)
    floor = ss.medfilt(M, 19)
    pk, _ = ss.find_peaks(M, distance=2)
    pk = [p for p in pk if M[p] - floor[p] > 3]
    pk = sorted(pk, key=lambda p: -(M[p]))[:topn]
    mx = max(M[p] for p in pk) if pk else 0
    s = " ".join(f"{librosa.midi_to_note(int(round(24 + p / 3)))}{(24 + p / 3 - round(24 + p / 3)) * 100:+.0f}:{M[p] - mx:.0f}/{M[p] - floor[p]:.0f}" for p in sorted(pk))
    print(f"{a:6.1f}-{b:6.1f}  {s}")
