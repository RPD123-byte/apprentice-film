#!/usr/bin/env python3
"""CQT piano-roll of an audio range, for transcribing pitched material (ANALYSIS ONLY).
Usage: tools/sound/pianoroll.py in.wav T0 T1 out.png [fmin_note=C2] [octaves=6] [--peaks]
   --peaks prints the strongest pitches per 0.25 s frame."""
import sys, numpy as np, soundfile as sf, librosa
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

a = [x for x in sys.argv[1:] if not x.startswith("--")]
path, t0, t1, out = a[0], float(a[1]), float(a[2]), a[3]
fmin = librosa.note_to_hz(a[4] if len(a) > 4 else "C2")
octs = int(a[5]) if len(a) > 5 else 6
info = sf.info(path)
sr = info.samplerate
y, _ = sf.read(path, start=int(t0 * sr), stop=int(t1 * sr), always_2d=True)
x = y.mean(1).astype(np.float32)
hop = 256
C = np.abs(librosa.cqt(x, sr=sr, hop_length=hop, fmin=fmin, n_bins=36 * octs, bins_per_octave=36))
D = librosa.amplitude_to_db(C, ref=np.max)
fig, ax = plt.subplots(figsize=(20, 12))
tt = t0 + np.arange(D.shape[1]) * hop / sr
ax.pcolormesh(tt, np.arange(D.shape[0]) / 3.0, D, vmin=-60, vmax=0, shading="auto", cmap="magma")
m0 = librosa.hz_to_midi(fmin)
ticks = np.arange(0, 12 * octs, 1)
ax.set_yticks(ticks)
ax.set_yticklabels([librosa.midi_to_note(int(round(m0 + k))) if k % 1 == 0 else "" for k in ticks], fontsize=6)
ax.set_xticks(np.arange(np.ceil(t0 * 4) / 4, t1, 0.25 if t1 - t0 < 8 else 0.5))
ax.tick_params(axis="x", labelsize=6, rotation=90)
ax.grid(alpha=0.15)
fig.tight_layout()
fig.savefig(out, dpi=80)
if "--peaks" in sys.argv:
    semis = C.reshape(12 * octs, 3, -1).max(1)
    fr = int(0.25 * sr / hop)
    for i in range(0, semis.shape[1] - fr, fr):
        s = semis[:, i:i + fr].mean(1)
        s = 20 * np.log10(s / (s.max() + 1e-12) + 1e-9)
        top = np.argsort(-s)[:8]
        print(f"{t0 + i * hop / sr:7.2f} " + " ".join(f"{librosa.midi_to_note(int(round(m0 + k)))}({s[k]:.0f})" for k in sorted(top)))
