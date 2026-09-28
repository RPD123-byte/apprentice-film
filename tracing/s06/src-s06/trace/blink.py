#!/usr/bin/env python3
# blink.py: the owl's blink (28.04-28.52), MEASURED per source frame (measurement only; outlines + values, no pixels).
# For each frame: the head transform vs 27.92 (ECC Euclidean fit of the head + headphones, eyes masked), the frame
# un-rolled into the neutral head's coordinates, ungraded (grade.py), then a value study (masses.py, "above" ground
# levels + dark levels, no opening) inside the two eye patches. Writes snapshots/s06-r2-src/out/owl_blink.json and
# src/shots/s06/data/owl_blink.js.
import cv2, numpy as np, json, os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import grade
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(SRC, 'out')
fr = lambda i: cv2.imread(os.path.join(SRC, 'f%03d.png' % i), 0).astype(np.float32)
ref = fr(31)   # 27.92
mask = np.zeros(ref.shape, np.uint8); mask[120:430, 1500:1860] = 1; cv2.rectangle(mask, (1575, 305), (1765, 380), 0, -1)
PATCH = [[1620, 342, 44, 33], [1721, 342, 44, 33]]
ell = lambda cx, cy, rx, ry: [[round(cx + rx * np.cos(a), 1), round(cy + ry * np.sin(a), 1)] for a in np.linspace(0, 2 * np.pi, 40, endpoint=False)]
def patch_study(un, key):
    pre, hb = grade.ungrade(np.clip(un / 255, 0, 1))
    for _ in range(3): hb = grade.halo_map(pre); pre, _ = grade.ungrade(np.clip(un / 255, 0, 1), hb)
    np.save(os.path.join(OUT, f'blink_{key}_pre.npy'), pre.astype(np.float32)); np.save(os.path.join(OUT, f'blink_{key}_g.npy'), un.astype(np.float32))
    cfg = {"src": os.path.join(OUT, f'blink_{key}_pre.npy'), "mask_src": os.path.join(OUT, f'blink_{key}_g.npy'), "dbgbox": [1570, 300, 1770, 385], "dbgzoom": 3,
           "layers": [
               {"name": "ground", "kind": "levels", "above": True, "box": [1570, 300, 1770, 385], "include": [ell(*p) for p in PATCH],
                "levels": [-0.01, 0.05, 0.1, 0.16, 0.23, 0.31, 0.4, 0.5, 0.6, 0.7, 0.79, 0.86, 0.91, 0.95], "blur": 0.7, "eps": 0.4, "smooth": 1, "minarea": 3}]}
    cp = os.path.join(OUT, f'blink_{key}.cfg.json'); json.dump(cfg, open(cp, 'w'))
    o = os.path.join(OUT, f'blink_{key}.mass.json')
    subprocess.run(['python3', os.path.join(HERE, 'masses.py'), cp, o, os.path.join(OUT, f'blink_{key}.dbg.png')], capture_output=True)
    return json.load(open(o))
# the still eyes before (26.76-27.96) and after (28.64-29.00) the blink: means of the frames
still = {'pre': patch_study(np.mean([fr(i) for i in range(2, 33)], axis=0), 'pre'), 'post': patch_study(np.mean([fr(i) for i in range(49, 59)], axis=0), 'post')}
frames = []
first, last = 34, 46     # 28.04 .. 28.52
for i in range(first, last + 1):
    t = round(26.72 + (i - 1) * 0.04, 2)
    im = fr(i)
    W = np.eye(2, 3, dtype=np.float32)
    cc, W = cv2.findTransformECC(cv2.GaussianBlur(ref, (0, 0), 1.5), cv2.GaussianBlur(im, (0, 0), 1.5), W, cv2.MOTION_EUCLIDEAN,
                                 (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), mask, 5)
    un = cv2.warpAffine(im, W, (im.shape[1], im.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    mass = patch_study(un, f'{t}')
    ang = float(np.degrees(np.arctan2(W[1, 0], W[0, 0])))
    frames.append({'t': t, 'warp': [round(float(v), 5) for v in W.flatten()], 'mass': mass})
    print(t, f'cc {cc:.4f} rot {ang:+.2f}', {k: len(v) for k, v in frames[-1]['mass'].items()})
json.dump({'patch': PATCH, 'frames': frames, **still}, open(os.path.join(OUT, 'owl_blink.json'), 'w'))
subprocess.run(['python3', os.path.join(HERE, 'blink2js.py')])
