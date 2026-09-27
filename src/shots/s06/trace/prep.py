#!/usr/bin/env python3
# prep.py: the measurement inputs for s06 (measurement only; nothing here is loaded by the film).
#   snapshots/s06-r2-src/f001..f058.png   the 58 source frames 26.72..29.00 (ffmpeg)
#   neutral.npy / smile.npy               means of the still frames 26.76-27.04 and 28.44-28.96 (graded, 0..255)
#   neutral_pre.npy                       neutral.npy with the film's finish undone (grade.py: vignette, S-curve,
#                                         halation), 0..1 — the value the drawing must have before src/lib/post.js
import cv2, numpy as np, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import grade
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); SRC = os.path.join(ROOT, 'snapshots/s06-r2-src')
REF = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
os.makedirs(os.path.join(SRC, 'out'), exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '26.72', '-i', REF, '-frames:v', '58', '-vsync', '0', os.path.join(SRC, 'f%03d.png')], check=True)
ims = [cv2.imread(os.path.join(SRC, 'f%03d.png' % i), 0).astype(np.float32) for i in range(1, 59)]
neu = np.mean(ims[1:9], axis=0); smi = np.mean(ims[43:57], axis=0)
np.save(os.path.join(SRC, 'neutral.npy'), neu); np.save(os.path.join(SRC, 'smile.npy'), smi)
pre, hb = grade.ungrade(np.clip(neu / 255, 0, 1))
for _ in range(4): hb = grade.halo_map(pre); pre, _ = grade.ungrade(np.clip(neu / 255, 0, 1), hb)
np.save(os.path.join(SRC, 'neutral_pre.npy'), pre.astype(np.float32))
print('round trip error', float(np.abs(grade.grade(pre) - neu / 255).mean() * 255))
