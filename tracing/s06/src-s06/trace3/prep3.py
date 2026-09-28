#!/usr/bin/env python3
# prep3.py: the r3 measurement inputs (measurement only; nothing here is loaded by the film).
#   snapshots/s06-r2-src/neutral_pre3.npy, smile_pre3.npy: the means of the still frames (neutral 26.76-27.04 =
#   trace/prep.py's neutral.npy, held smile 28.44-28.96 = smile.npy) with the film's finish undone (trace/grade.py) —
#   and, unlike trace/prep.py, the finish's exposure flicker divided out first: src/lib/post.js multiplies every frame
#   by 1 + 0.018 sin(2pi 0.9 t) + 0.012 sin(2pi 2.3 t + 1) (it matches the source's own per-frame exposure to ~0.3 %),
#   so a mean over frames carries the mean flicker of those frames (neutral +1.7 %, smile -1.0 %), which the grade
#   would then apply a second time.
import os, sys, math, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '../trace'))
import grade
SRC = os.path.abspath(os.path.join(HERE, '../../../../snapshots/s06-r2-src'))
flick = lambda t: 1 + 0.018 * math.sin(t * 2 * math.pi * 0.9) + 0.012 * math.sin(t * 2 * math.pi * 2.3 + 1)
for name, out, i0, i1 in (('neutral.npy', 'neutral_pre3.npy', 1, 9), ('smile.npy', 'smile_pre3.npy', 43, 57)):
    fm = float(np.mean([flick(26.72 + i * 0.04) for i in range(i0, i1)]))
    g = np.clip(np.load(os.path.join(SRC, name)) / 255 / fm, 0, 1)
    pre, hb = grade.ungrade(g)
    for _ in range(4): hb = grade.halo_map(pre); pre, _ = grade.ungrade(g, hb)
    np.save(os.path.join(SRC, out), pre.astype(np.float32))
    print(out, 'mean flicker %.4f' % fm, 'round trip error', float(np.abs(grade.grade(pre) - g).mean() * 255))

# the owl after its blink: mean of the frames 28.56-29.00 (f047..f058), each divided by its own flicker first
import cv2
fr = lambda i: cv2.imread(os.path.join(SRC, 'f%03d.png' % (i + 1)), 0).astype(np.float32) / 255
def ungr(g):
    pre, hb = grade.ungrade(np.clip(g, 0, 1))
    for _ in range(4): hb = grade.halo_map(pre); pre, _ = grade.ungrade(np.clip(g, 0, 1), hb)
    return pre.astype(np.float32)
post = np.mean([fr(i) / flick(26.72 + i * 0.04) for i in range(46, 58)], axis=0)
np.save(os.path.join(SRC, 'owl_post_pre3.npy'), ungr(post)); print('owl_post_pre3.npy')
# the blink frames 28.04-28.52 (f034..f046) one by one: denoised (non-local means, the grain is the finish's own and
# the film adds its own again), flicker divided out, ungraded
for i in range(33, 46):
    t = 26.72 + i * 0.04
    g8 = cv2.imread(os.path.join(SRC, 'f%03d.png' % (i + 1)), 0)
    d = cv2.fastNlMeansDenoising(g8, None, h=5, templateWindowSize=5, searchWindowSize=15).astype(np.float32) / 255
    np.save(os.path.join(SRC, 'blink_%.2f_pre3.npy' % t), ungr(d / flick(t))); print('blink_%.2f_pre3.npy' % t)
