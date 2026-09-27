#!/usr/bin/env python3
"""f0 contour of a short voiced event (ANALYSIS ONLY, pYIN). Usage: tools/sound/contour.py in.wav t0 t1 [fmin=150] [fmax=2000]"""
import sys, numpy as np, soundfile as sf, librosa
path, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
fmin = float(sys.argv[4]) if len(sys.argv) > 4 else 150; fmax = float(sys.argv[5]) if len(sys.argv) > 5 else 2000
sr = sf.info(path).samplerate
y, _ = sf.read(path, start=int(t0 * sr), stop=int(t1 * sr), always_2d=True)
x = librosa.resample(y.mean(1).astype(np.float32), orig_sr=sr, target_sr=16000)
f0, vf, vp = librosa.pyin(x, fmin=fmin, fmax=fmax, sr=16000, frame_length=512, hop_length=80)
ts = t0 + np.arange(len(f0)) * 80 / 16000
pts = [(round(float(t), 3), int(f)) for t, f, v in zip(ts, f0, vf) if v and not np.isnan(f)]
print(f"{t0}-{t1}:", pts[::3])
