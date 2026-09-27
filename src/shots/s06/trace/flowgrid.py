#!/usr/bin/env python3
# flowgrid.py: the face's measured motion (measurement only): the optical flow (DIS, medium) from the neutral mean
# to every source frame, smoothed (Gaussian 4 px) and sampled on a 12 px grid in two boxes (brows, mouth). The film
# moves the neutral drawing's points with it (bilinear). Writes out/flowgrid.json and src/shots/s06/data/flow.js.
import cv2, numpy as np, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(SRC, 'out')
BOXES = {'brows': [770, 150, 1350, 282], 'mouth': [880, 596, 1276, 784]}
STEP = 12
neu = np.load(os.path.join(SRC, 'neutral.npy')); N8 = np.ascontiguousarray(np.clip(neu, 0, 255).astype(np.uint8))
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
def grid(img):
    F = dis.calc(N8, np.ascontiguousarray(np.clip(img, 0, 255).astype(np.uint8)), None)
    F = cv2.GaussianBlur(F, (0, 0), 4)
    out = {}
    for k, (x0, y0, x1, y1) in BOXES.items():
        xs = np.arange(x0, x1 + 1, STEP); ys = np.arange(y0, y1 + 1, STEP)
        out[k] = [int(round(float(v) * 5)) for y in ys for x in xs for v in F[y, x]]
    return out
fr = lambda i: cv2.imread(os.path.join(SRC, 'f%03d.png' % i), 0).astype(np.float32)
t_of = lambda i: round(26.72 + (i - 1) * 0.04, 2)
res = {'step': STEP, 'boxes': BOXES, 'smile': grid(np.load(os.path.join(SRC, 'smile.npy'))), 'frames': {}}
for i in list(range(1, 4)) + list(range(10, 44)):
    res['frames'][str(t_of(i))] = grid(fr(i))
json.dump(res, open(os.path.join(OUT, 'flowgrid.json'), 'w'))
lines = ['// The measured motion of the face in s06 (trace/flowgrid.py): optical flow neutral -> each moving source frame,',
         '// smoothed and sampled every %d px in two boxes; values are dx, dy per node x 5 (row-major). No pixels are stored.' % STEP,
         'export const STEP = %d;' % STEP, 'export const BOXES = %s;' % json.dumps(BOXES),
         'export const SMILE = %s;' % json.dumps(res['smile'], separators=(',', ':')), 'export const FRAMES = {']
for t, g in res['frames'].items(): lines.append('  "%s": %s,' % (t, json.dumps(g, separators=(',', ':'))))
lines.append('};')
p = os.path.join(ROOT, 'src/shots/s06/data/flow.js'); open(p, 'w').write('\n'.join(lines) + '\n'); print('->', p, os.path.getsize(p) // 1024, 'KB')
