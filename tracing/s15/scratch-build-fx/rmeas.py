import sys, json, re, numpy as np, cv2
from rlib import *
# rmeas.py TAKE [TAKE...] : roto/TAKE.txt -> roto/TAKE.json (corners + measured values); writes rotoTAKE.js
ROOT = '/Users/computer/rootline/apprentice-film/src/shots/s15'
def parse(path):
    faces, frames, cur = {}, {}, None
    for ln in open(path):
        ln = ln.split('#')[0].strip()
        if not ln: continue
        if ln.startswith('@'):
            p = ln[1:].split(); fid = p[0]; o = {}
            for kv in p[1:]:
                k, v = kv.split('=') if '=' in kv else (kv, '1')
                try: v = float(v)
                except: pass
                o[k] = v
            faces[fid] = o; continue
        if ln.startswith('='):
            cur = int(ln[1:]); frames[cur] = []; continue
        p = ln.split(); fid = p[0]
        if len(p) == 2 and p[1].startswith('<'):
            # copy this face from another frame: "ID <1026" or shift "ID <1026+dx,dy"
            m = re.match(r'<(\d+)(?:\+?(-?[\d.]+),(-?[\d.]+))?', p[1]); g = int(m.group(1))
            src_ = [r for r in frames[g] if r[0] == fid][0]
            dx = float(m.group(2) or 0); dy = float(m.group(3) or 0)
            frames[cur].append([fid, [[x + dx, y + dy] for x, y in src_[1]], src_[2]]); continue
        pts = [[float(a) for a in q.split(',')] for q in p[1:5]]
        extra = {}
        for kv in p[5:]:
            k, v = kv.split('='); extra[k] = [float(a) for a in v.split(',')]
        frames[cur].append([fid, pts, extra])
    return faces, frames
LUT_X = np.linspace(0, 1, 4096); LUT_Y = 0.65 * LUT_X + 0.35 * (3 * LUT_X ** 2 - 2 * LUT_X ** 3)
def inv_s(y): return np.interp(y, LUT_Y, LUT_X)
yy, xx = np.mgrid[0:H, 0:W]
qx = ((xx + 0.5) / W - 0.5) * 2; qy = ((yy + 0.5) / H - 0.5) * 2
VIG = 1 - 0.38 * np.clip((qx * qx + qy * qy) / 2, 0, 1) ** 1.15
def paint_value(img):
    y = img.astype(np.float32) / 255.0
    y = np.clip(y / VIG, 0, 1)
    f1 = inv_s(y)                       # before the S-curve (after halation)
    # undo the halation roughly (local highlights assumed like the pixel's own blurred value)
    b = cv2.GaussianBlur(f1, (0, 0), 20)
    hb = np.clip((b - 120 / 255) / (135 / 255), 0, 1) * b
    f0 = 1 - (1 - f1) / np.maximum(0.3, 1 - 0.5 * hb * 0.85)
    return np.clip(f0, 0, 1)
def unit_homog(P):
    """homography from screen to unit square (u right along p0->p1, v along p0->p3)"""
    src_ = np.array(P, np.float32); dst = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], np.float32)
    return cv2.getPerspectiveTransform(src_, dst)
def measure(take, gain=None):
    faces, frames = parse(f'{FX}/roto/{take}.txt')
    out = {}
    for f, rows in frames.items():
        img = src(f)
        pv = paint_value(img)
        idx = np.full((H, W), -1, np.int16)
        for i, (fid, P, ex) in enumerate(rows):
            cv2.fillPoly(idx, [np.round(np.array(P)).astype(np.int32)], i)
        om = owlmask(f, 1.1)
        res = []
        for i, (fid, P, ex) in enumerate(rows):
            m = (idx == i) & ~om
            # keep off the face's edges (ink lines and neighbours' blur)
            m = cv2.erode(m.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
            ys, xs = np.nonzero(m)
            if 'v' in ex:
                vals = ex['v'] if len(ex['v']) == 4 else ex['v'] * 4
            elif len(xs) < 50:
                vals = [0.3] * 4
            else:
                if len(xs) > 20000:
                    sel = np.linspace(0, len(xs) - 1, 20000).astype(int); xs = xs[sel]; ys = ys[sel]
                Hm = unit_homog(P)
                uv = cv2.perspectiveTransform(np.stack([xs, ys], 1)[None].astype(np.float64), Hm)[0]
                u = np.clip(uv[:, 0], 0, 1); v = np.clip(uv[:, 1], 0, 1)
                A = np.stack([(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v], 1)
                b = pv[ys, xs]
                lam = 0.08 * len(xs)
                mean = b.mean()
                M = A.T @ A + lam * np.eye(4); rhs = A.T @ b + lam * mean
                vals = np.clip(np.linalg.solve(M, rhs), -0.5, 1.6).tolist()
            res.append([fid] + [round(c, 1) for q in P for c in q] + [round(x, 3) for x in vals])
        out[f] = res
    return faces, out
def export(take, faces, frames, cal=None):
    fo = {}
    for fid, o in faces.items():
        d = {}
        for k, v in o.items():
            if k in ('tex',): d[k] = v
            elif k in ('style', 'ink', 'top', 'su', 'sv'): d[k] = v
        fo[fid] = d
    js = f'// s15 take {take}: roto faces measured on the source (roto.js). frames: {{ film frame: [[id, x0,y0, x1,y1, x2,y2, x3,y3 (screen px: bl, br, tr, tl), v0..v3 (face value at those corners)], ...] }} in draw order (far first); numbers only\n'
    js += f'export const ROTO_{take} = {{ faces: {json.dumps(fo)}, frames: {{\n'
    for f in sorted(frames):
        rows = frames[f]
        if cal is not None: rows = cal(f, rows)
        js += f'  {f}: {json.dumps(rows, separators=(",", ":"))},\n'
    js += '} };\n'
    open(f'{ROOT}/roto{take}.js', 'w').write(js)
if __name__ == '__main__':
    for take in sys.argv[1:]:
        faces, frames = measure(take)
        json.dump({'faces': faces, 'frames': frames}, open(f'{FX}/roto/{take}.json', 'w'))
        # optional calibration gains from a previous render (roto/TAKE_gain.json: {frame: {id: gain}})
        import os
        gp = f'{FX}/roto/{take}_corr.json'
        cal = None
        if os.path.exists(gp):
            G = json.load(open(gp))
            def cal(f, rows):
                g = G.get(str(f), {})
                return [r[:9] + [round(max(-0.5, x + d), 3) for x, d in zip(r[9:13], g.get(r[0], [0, 0, 0, 0]))] for r in rows]
        export(take, faces, frames, cal)
        print(take, len(frames), 'frames', sum(len(r) for r in frames.values()), 'faces')
