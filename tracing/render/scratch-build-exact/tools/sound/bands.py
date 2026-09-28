#!/usr/bin/env python3
"""Octave-band floor levels (ANALYSIS ONLY): per range, the q-th percentile of 100 ms band RMS (dBFS, mid channel).
Usage: tools/sound/bands.py in.wav "a-b,c-d" [q=25]   -> one row per range: 31 63 125 250 500 1k 2k 4k 8k 16k"""
import sys, numpy as np, soundfile as sf, scipy.signal as ss
CF = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
def band_levels(x, sr, q=25, win=0.1):
    out = []
    for c in CF:
        lo, hi = c / np.sqrt(2), min(c * np.sqrt(2), sr / 2 * 0.95)
        y = ss.sosfiltfilt(ss.butter(3, [lo, hi], "band", fs=sr, output="sos"), x)
        w = int(win * sr); m = len(y) // w
        r = np.sqrt((y[:m * w].reshape(m, w) ** 2).mean(1) + 1e-14)
        out.append(20 * np.log10(np.percentile(r, q)))
    return out
if __name__ == "__main__":
    path = sys.argv[1]; rngs = [tuple(map(float, r.split("-"))) for r in sys.argv[2].split(",")]
    q = float(sys.argv[3]) if len(sys.argv) > 3 else 25
    sr = sf.info(path).samplerate
    print("range          " + " ".join(f"{int(c):>5d}" for c in CF))
    for a, b in rngs:
        y, _ = sf.read(path, start=int(a * sr), stop=int(b * sr), always_2d=True)
        print(f"{a:6.2f}-{b:6.2f}  " + " ".join(f"{v:5.1f}" for v in band_levels(y.mean(1), sr, q)))
