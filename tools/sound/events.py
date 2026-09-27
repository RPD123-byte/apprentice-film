#!/usr/bin/env python3
"""Onset table of a track (ANALYSIS ONLY): time, onset strength, 20 ms peak level (dBFS), level of the bed just before,
band split of the attack (low <250 Hz / mid 250-2.5k / high >2.5k, dB relative), spectral centroid, pan (L-R dB).
Usage: tools/sound/events.py in.wav out.tsv [delta=0.05]"""
import sys, numpy as np, soundfile as sf, librosa, scipy.signal as ss
path, out = sys.argv[1], sys.argv[2]
delta = float(sys.argv[3]) if len(sys.argv) > 3 else 0.05
y, sr = sf.read(path, always_2d=True)
x = y.mean(1).astype(np.float32)
hop = 256
oenv = librosa.onset.onset_strength(y=x, sr=sr, hop_length=hop)
on = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, units="frames", delta=delta, backtrack=False)
sos = {k: ss.butter(4, f, b, fs=sr, output="sos") for k, (f, b) in {"lo": (250, "low"), "mid": ([250, 2500], "band"), "hi": (2500, "high")}.items()}
bands = {k: ss.sosfiltfilt(s, x) for k, s in sos.items()}
def lev(z):
    return 10 * np.log10(np.mean(z ** 2) + 1e-14)
rows = []
for fr in on:
    t = fr * hop / sr
    i = int(t * sr)
    a, b = max(0, i - int(0.01 * sr)), min(len(x), i + int(0.05 * sr))
    # peak 20 ms rms after the onset
    w = int(0.02 * sr)
    seg = x[a:b]
    pk = max(lev(seg[j:j + w]) for j in range(0, max(1, len(seg) - w), w // 4))
    pre = lev(x[max(0, i - int(0.12 * sr)):max(1, i - int(0.02 * sr))])
    bl = {k: lev(v[i:i + int(0.04 * sr)]) for k, v in bands.items()}
    m = max(bl.values())
    S = np.abs(np.fft.rfft(x[i:i + 2048] * np.hanning(len(x[i:i + 2048])), 2048))
    f = np.fft.rfftfreq(2048, 1 / sr)
    cen = float((S * f).sum() / (S.sum() + 1e-12))
    pan = lev(y[i:i + int(0.04 * sr), 0]) - lev(y[i:i + int(0.04 * sr), 1])
    rows.append((t, oenv[fr], pk, pre, bl["lo"] - m, bl["mid"] - m, bl["hi"] - m, cen, pan))
with open(out, "w") as fo:
    fo.write("t\tstrength\tpeak_db\tpre_db\tlo\tmid\thi\tcentroid\tpan\n")
    for r in rows:
        fo.write("%.3f\t%.2f\t%.1f\t%.1f\t%.0f\t%.0f\t%.0f\t%.0f\t%.1f\n" % r)
print(len(rows), "onsets")
