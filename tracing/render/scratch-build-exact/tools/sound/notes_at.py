#!/usr/bin/env python3
"""New pitched energy at given onset times (ANALYSIS ONLY): spectrum after the onset minus spectrum before, peaks -> notes.
Usage: tools/sound/notes_at.py in.wav t1,t2,... [win_after=0.25] [fmin=60] [fmax=2000] [range_db=18]"""
import sys, numpy as np, soundfile as sf, librosa
path = sys.argv[1]; ts = [float(v) for v in sys.argv[2].split(",")]
wa = float(sys.argv[3]) if len(sys.argv) > 3 else 0.25
fmin = float(sys.argv[4]) if len(sys.argv) > 4 else 60; fmax = float(sys.argv[5]) if len(sys.argv) > 5 else 2000
rng = float(sys.argv[6]) if len(sys.argv) > 6 else 18
y, sr = sf.read(path, always_2d=True); x = y.mean(1)
N = 16384
def spec(a, b):
    z = x[int(a * sr):int(b * sr)]
    z = z * np.hanning(len(z))
    return np.abs(np.fft.rfft(z, N)) / (len(z) + 1e-9)
f = np.fft.rfftfreq(N, 1 / sr)
for t in ts:
    A = spec(t + 0.02, t + 0.02 + wa); B = spec(t - 0.12, t - 0.01)
    D = np.clip(A ** 2 - B ** 2, 0, None)
    Ddb = 10 * np.log10(D + 1e-16)
    k = (f > fmin) & (f < fmax)
    from scipy.signal import find_peaks
    pk, _ = find_peaks(Ddb, distance=6)
    pk = [p for p in pk if k[p]]
    top = max(Ddb[p] for p in pk)
    pk = [p for p in pk if Ddb[p] > top - rng]
    pk = sorted(pk, key=lambda p: -Ddb[p])[:12]
    out = []
    for p in sorted(pk):
        m = librosa.hz_to_midi(f[p]); out.append(f"{librosa.midi_to_note(int(round(m)))}{(m - round(m)) * 100:+.0f}c/{f[p]:.0f}({Ddb[p] - top:.0f})")
    print(f"{t:7.3f}  " + " ".join(out))
