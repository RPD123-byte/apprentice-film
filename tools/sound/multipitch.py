#!/usr/bin/env python3
"""Iterative harmonic-sum multi-pitch estimate at onset times (ANALYSIS ONLY, Klapuri-style).
Usage: tools/sound/multipitch.py in.wav t1,t2,... [win=0.4] [n=5] [lo_midi=36] [hi_midi=88] [cents=0]"""
import sys, numpy as np, soundfile as sf, librosa
path = sys.argv[1]; ts = [float(v) for v in sys.argv[2].split(",")]
win = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
nmax = int(sys.argv[4]) if len(sys.argv) > 4 else 5
lo, hi = (int(sys.argv[5]) if len(sys.argv) > 5 else 36), (int(sys.argv[6]) if len(sys.argv) > 6 else 88)
cents = float(sys.argv[7]) if len(sys.argv) > 7 else 0.0
info = sf.info(path); sr = info.samplerate
N = 32768
f = np.fft.rfftfreq(N, 1 / sr)
for t in ts:
    y, _ = sf.read(path, start=int((t + 0.04) * sr), stop=int((t + 0.04 + win) * sr), always_2d=True)
    z = y.mean(1); z = z * np.hanning(len(z))
    A = np.abs(np.fft.rfft(z, N))
    yb, _ = sf.read(path, start=int((t - 0.15) * sr), stop=int((t - 0.01) * sr), always_2d=True)
    zb = yb.mean(1); zb = zb * np.hanning(len(zb))
    B = np.abs(np.fft.rfft(zb, N)) * (len(z) / max(1, len(zb)))
    S = np.sqrt(np.clip(A ** 2 - 0.6 * B ** 2, 0, None))
    S = S / (S.max() + 1e-12)
    picked = []
    R = S.copy()
    for it in range(nmax):
        best, bm, bsal = None, None, 0
        for m10 in range(lo * 10, hi * 10, 2):
            m = m10 / 10 + cents / 100
            f0 = librosa.midi_to_hz(m)
            sal = 0
            for h in range(1, 7):
                fh = f0 * h
                if fh > sr / 2 - 100: break
                i = int(round(fh * N / sr)); w = max(2, int(i * 0.006))
                sal += R[max(0, i - w):i + w + 1].max() * (1.0 / (h ** 0.6))
            if sal > bsal: bsal, best, bm = sal, f0, m
        if best is None or (picked and bsal < 0.18 * picked[0][2]): break
        picked.append((bm, best, bsal))
        for h in range(1, 7):
            i = int(round(best * h * N / sr)); w = max(3, int(i * 0.01))
            R[max(0, i - w):i + w + 1] *= 0.15
    s = " ".join(f"{librosa.midi_to_note(int(round(m)))}{(m - round(m)) * 100:+.0f}({sal / picked[0][2]:.2f})" for m, fq, sal in sorted(picked))
    print(f"{t:8.3f}  {s}")
