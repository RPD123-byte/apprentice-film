#!/usr/bin/env python3
# Compare a harness render against a reference frame (both graded): blurred CIE76 dE stats, a dE heat map,
# and zoomed render|reference crops. Usage: cmp.py render.png ref.png outdir [x0,y0,x1,y1 ...] [--mask x0,y0,x1,y1]
import cv2, sys, os, numpy as np
a = sys.argv
R = cv2.imread(a[1]); S = cv2.imread(a[2]); out = a[3]; os.makedirs(out, exist_ok=True)
crops = []; masks = []
i = 4
while i < len(a):
    if a[i] == '--mask': masks.append([int(v) for v in a[i + 1].split(',')]); i += 2; continue
    crops.append([int(v) for v in a[i].split(',')]); i += 1
H, W = S.shape[:2]
valid = np.ones((H, W), bool)
for x0, y0, x1, y1 in masks: valid[y0:y1, x0:x1] = False
def lab(im, s):
    f = cv2.GaussianBlur(im, (0, 0), s) if s > 0 else im
    return cv2.cvtColor(f.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
for s in (2, 8, 20):
    d = np.linalg.norm(lab(R, s) - lab(S, s), axis=2)
    v = d[valid]
    print(f"sigma {s:>2}: mean dE {v.mean():5.2f}  p50 {np.percentile(v,50):5.2f}  p95 {np.percentile(v,95):5.2f}")
    if s == 8:
        hm = cv2.applyColorMap(np.clip(d * 8, 0, 255).astype(np.uint8), cv2.COLORMAP_JET)
        hm[~valid] = 0
        cv2.imwrite(os.path.join(out, 'de8.jpg'), cv2.resize(hm, (W // 2, H // 2)))
        # per-block table (200 px) to find the worst areas
        rows = []
        for by in range(0, H, 200):
            for bx in range(0, W, 200):
                blk = d[by:by + 200, bx:bx + 200][valid[by:by + 200, bx:bx + 200]]
                if blk.size: rows.append((blk.mean(), bx, by))
        rows.sort(reverse=True)
        print('worst 200px blocks (dE8, x, y):', ' '.join(f"{m:.1f}@{x},{y}" for m, x, y in rows[:10]))
sb = np.vstack([cv2.resize(R, (W // 2, H // 2)), cv2.resize(S, (W // 2, H // 2))])
cv2.imwrite(os.path.join(out, 'stack.jpg'), sb, [cv2.IMWRITE_JPEG_QUALITY, 88])
for k, (x0, y0, x1, y1) in enumerate(crops):
    r = R[y0:y1, x0:x1]; s = S[y0:y1, x0:x1]
    z = min(2.0, 1000 / max(1, (x1 - x0)))
    r = cv2.resize(r, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC); s = cv2.resize(s, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC)
    pair = np.vstack([r, np.full((6, r.shape[1], 3), 255, np.uint8), s]) if (x1 - x0) > (y1 - y0) else np.hstack([r, np.full((r.shape[0], 6, 3), 255, np.uint8), s])
    cv2.imwrite(os.path.join(out, f'crop-{k:02d}-{x0}-{y0}.jpg'), pair, [cv2.IMWRITE_JPEG_QUALITY, 90])
