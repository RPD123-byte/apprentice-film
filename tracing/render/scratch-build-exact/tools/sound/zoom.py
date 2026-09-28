#!/usr/bin/env python3
"""Grid of short spectrogram windows (ANALYSIS ONLY). Usage: tools/sound/zoom.py in.wav out.png "t0:dur:label,..." [nfft=1024] [cols=4]"""
import sys, numpy as np, soundfile as sf, scipy.signal as ss
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
path, out, spec = sys.argv[1], sys.argv[2], sys.argv[3]
nfft = int(sys.argv[4]) if len(sys.argv) > 4 else 1024
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 4
items = [s.split(":") for s in spec.split(",")]
sr = sf.info(path).samplerate
rows = (len(items) + cols - 1) // cols
fig, axs = plt.subplots(rows, cols, figsize=(5 * cols, 3.6 * rows), squeeze=False)
for k, it in enumerate(items):
    t0, d = float(it[0]), float(it[1]); lab = it[2] if len(it) > 2 else ""
    y, _ = sf.read(path, start=int(t0 * sr), stop=int((t0 + d) * sr), always_2d=True)
    x = y.mean(1)
    f, t, S = ss.stft(x, sr, nperseg=nfft, noverlap=nfft - nfft // 8)
    S = 20 * np.log10(np.abs(S) + 1e-9)
    ax = axs[k // cols][k % cols]
    kk = (f > 30) & (f < 20000)
    vmax = -20 if S[kk].max() < -20 else S[kk].max()
    ax.pcolormesh(t + t0, f[kk], S[kk], vmin=vmax - 80, vmax=vmax, shading="auto", cmap="magma")
    ax.set_yscale("log"); ax.set_title(f"{lab} {t0:.2f}+{d}", fontsize=9); ax.tick_params(labelsize=7)
for k in range(len(items), rows * cols): axs[k // cols][k % cols].axis("off")
fig.tight_layout(); fig.savefig(out, dpi=70)
