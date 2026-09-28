#!/usr/bin/env python3
# calibrate.py — close the loop between a render and the source (measurement only).
#   calibrate.py masses render.png source.png masses.json layer [gain] [ground_r]
#       per item: compare the band (item minus the next item) in the render vs the source — the local ground (dilated
#       max, for wash layers) or the value (levels) — and shift the item's ungraded value v.
#   calibrate.py strokes render.png source.png strokes.json [gain] [x0 y0 x1 y1]
#       per stroke: compare the darkness (local ground - value, blurred 1 px) along the centre-line; shift every point's
#       v (and keep it between 0 and the ground b). Points where the render's ground differs a lot from the source's
#       (a different layer covers them) are ignored.
# The slope d(graded)/d(ungraded) is estimated from the grade model (grade.py) at each place.
import cv2, sys, json, numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__))
import grade
mode = sys.argv[1]
R = cv2.imread(sys.argv[2], 0).astype(np.float32); S = cv2.imread(sys.argv[3], 0).astype(np.float32)
H, W = R.shape
def ground(img, r=15):
    g = cv2.GaussianBlur(img, (0, 0), 1.0)
    return cv2.GaussianBlur(cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))), (0, 0), 3)
hb = grade.halo_map(np.clip(S / 255, 0, 1)); vig = grade.vignette()
def slope(pre):   # d graded / d pre (0..1 units) at ungraded value pre and halo hb
    f = 1 - (1 - pre) * (1 - 0.5 * hb)
    return (0.65 + 0.35 * 6 * f * (1 - f)) * (1 - 0.5 * hb) * vig
if mode == 'masses':
    path, layer = sys.argv[4], sys.argv[5]; gain = float(sys.argv[6]) if len(sys.argv) > 6 else 0.7
    M = json.load(open(path)); items = M[layer]
    kind_wash = layer.startswith('wash') or (len(sys.argv) > 7 and sys.argv[7] == 'ground')
    A = ground(R) if kind_wash else cv2.GaussianBlur(R, (0, 0), 1.0)
    B = ground(S) if kind_wash else cv2.GaussianBlur(S, (0, 0), 1.0)
    masks = []
    for it in items:
        m = np.zeros((H, W), np.uint8)
        for ring in it['rings']:
            mm = np.zeros((H, W), np.uint8); cv2.fillPoly(mm, [np.round(np.array(ring) * 4).astype(np.int32)], 1, shift=2); m ^= mm
        masks.append(m.astype(bool))
    for i, it in enumerate(items):
        band = masks[i].copy()
        if i + 1 < len(masks): band &= ~masks[i + 1]
        if band.sum() < 20: continue
        da = float(np.median(A[band] - B[band])) / 255
        sl = float(np.median(slope(np.full(band.sum(), it['v'], np.float32) if False else it['v'])[band])) if False else float(np.median(slope(it['v'])[band]))
        nv = float(np.clip(it['v'] - gain * da / max(0.15, sl), 0, 1))
        print(f'{layer} {i}: v {it["v"]:.3f} -> {nv:.3f}  (render-source {da*255:+.1f}, slope {sl:.2f}, n {band.sum()})')
        it['v'] = round(nv, 3)
    json.dump(M, open(path, 'w'))
elif mode == 'strokes':
    path = sys.argv[4]; gain = float(sys.argv[5]) if len(sys.argv) > 5 else 0.6
    box = [int(v) for v in sys.argv[6:10]] if len(sys.argv) > 9 else [0, 0, W, H]
    ST = json.load(open(path))
    GA, GB = ground(R), ground(S)
    A = cv2.GaussianBlur(R, (0, 0), 1.0); B = cv2.GaussianBlur(S, (0, 0), 1.0)
    moved = []; skipped = 0
    for st in ST:
        pts = st if isinstance(st, list) else st['pts']
        dd = []; sl = []
        for p in pts:
            x, y = int(round(p[0])), int(round(p[1]))
            if not (box[0] <= x < box[2] and box[1] <= y < box[3]): continue
            if abs(GA[y, x] - GB[y, x]) > 35: continue
            ya, yb = max(0, y - 1), min(H, y + 2); xa, xb = max(0, x - 1), min(W, x + 2)
            # absolute centre values (both blurred 1 px): render darker than the source -> raise v
            dd.append((B[ya:yb, xa:xb].min() - A[ya:yb, xa:xb].min()) / 255); sl.append(slope(p[3])[y, x])
        if len(dd) < max(1, len(pts) // 2): skipped += 1; continue
        e = float(np.mean(dd)); s_ = max(0.15, float(np.mean(sl)))
        # render too dark (dr > ds) -> raise v
        dv = gain * e / s_
        for p in pts: p[3] = round(float(np.clip(p[3] + dv, 0, max(p[4], p[3]))), 3)
        moved.append(dv)
    json.dump(ST, open(path, 'w'))
    m = np.array(moved)
    print(f'strokes: {len(m)} calibrated, {skipped} skipped; dv mean {m.mean():+.3f} |dv| {np.abs(m).mean():.3f}')
