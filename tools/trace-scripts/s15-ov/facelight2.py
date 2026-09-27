# measured face values, bilinear per face: for every visible face of a set, fit corner values (u,v = 00, 10, 11, 01)
# to the source frame's brightness over the face (owl masked), taken back through the global grade (vignette,
# S-curve). Keyed faces get per-frame values, static faces one fit over all frames. With a render dir (made with the
# current values), each corner is corrected by the source/render ratio instead.
# usage: facelight2.py SET F0 F1 OUT.js [render_dir | -]
import json, subprocess, sys, os, glob, re, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm')
from common import SRC, owlmask, FRAMES
from ov import render_ids
from proj import basis, K as KF
HERE = os.path.dirname(os.path.abspath(__file__))
S = 2; W, H = 2206 // S, 946 // S
key, f0, f1, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
rdir = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != '-' else None
frames = [f for f in FRAMES if f0 <= f <= f1]
js = json.loads(subprocess.check_output(['node', f'{HERE}/dump.mjs', ','.join(f'{f/25:.2f}' for f in frames), key]))
yy, xx = np.mgrid[0:H, 0:W]
q = np.stack([(xx + 0.5) / W - 0.5, (yy + 0.5) / H - 0.5]) * 2
vig = 1 - 0.38 * np.clip((q[0] ** 2 + q[1] ** 2) / 2, 0, 1) ** 1.15
lut_in = np.linspace(0, 1, 2001); lut_out = lut_in * 0.65 + 0.35 * lut_in * lut_in * (3 - 2 * lut_in)
def inv_s(y): return np.interp(np.clip(y, 0, 1), lut_out, lut_in)
def prev_values():
    if not os.path.exists(out): return {}, {}
    txt = open(out).read()
    a = re.search(r'LIGHTS_\w+ = (\{.*?\});\n', txt, re.S); b = re.search(r'STATIC_\w+ = (\{.*?\});\n', txt, re.S)
    return (json.loads(a.group(1)) if a else {}), (json.loads(b.group(1)) if b else {})
PL, PS = prev_values()
renders = {}
if rdir:
    fl = glob.glob(rdir + '/frame-*.png')
    if not fl: sys.exit('no renders in ' + rdir)
    for fp in fl:
        t = float(re.search(r'at-([\d.]+)s', fp).group(1)); fi = int(round(np.ceil(t * 25 - 1e-6)))
        renders[fi] = cv2.resize(cv2.imread(fp, 0), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
def fit4(u, v, y, lam=0.08):
    A = np.stack([(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v], 1)
    m = y.mean(); n = len(y)
    R = np.sqrt(lam * n) * np.eye(4)
    c, *_ = np.linalg.lstsq(np.vstack([A, R]), np.concatenate([y, np.full(4, np.sqrt(lam * n) * m)]), rcond=None)
    return c
def as4(x):
    if isinstance(x, list): return np.array(x, float)
    return None if x is None or x < 0 else np.full(4, float(x))
keyed = {}; stat = {}
for k, d in js.items():
    fi = int(round(d['t'] * 25))
    ib, kb, zb = render_ids(d['polys'])
    src = cv2.resize(cv2.imread(f'{SRC}/f{fi}.png', 0), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
    om = cv2.resize(owlmask(fi, 1.0).astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST) > 0
    fwd, rgt, up = basis(d['yaw'], d['pitch'], d['roll']); e = np.array(d['eye'])
    ren = renders.get(fi)
    for p in d['polys']:
        m = (ib == p['id']) & om
        m = cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        n = int(m.sum())
        if n < 150: continue
        Q = np.array(p['q'], float); U = Q[1] - Q[0]; V = Q[3] - Q[0]; nrm = np.cross(U, V)
        ys, xs = np.nonzero(m)
        if len(ys) > 4000: sel = np.linspace(0, len(ys) - 1, 4000).astype(int); ys, xs = ys[sel], xs[sel]
        a = ((xs + 0.5) * S - 1103) / KF; b = -((ys + 0.5) * S - 473) / KF
        dirs = fwd[None] + rgt[None] * a[:, None] + up[None] * b[:, None]
        den = dirs @ nrm
        ok = np.abs(den) > 1e-9
        t = ((Q[0] - e) @ nrm) / np.where(ok, den, 1)
        X = e[None] + dirs * t[:, None]
        u = np.clip(((X - Q[0]) @ U) / (U @ U), 0, 1); v = np.clip(((X - Q[0]) @ V) / (V @ V), 0, 1)
        yv = inv_s(src[ys, xs] / 255.0 / vig[ys, xs])
        cs = fit4(u, v, yv)
        cr = fit4(u, v, inv_s(ren[ys, xs] / 255.0 / vig[ys, xs])) if ren is not None else None
        zf = float(np.mean([qq[2] for qq in p['s']]))
        if p.get('kb') is None:
            if zf > 5: cs = np.minimum(cs, 0.3)
            stat.setdefault(p['id'], []).append((cs, cr, n))
        else:
            keyed.setdefault(p['kb'], {}).setdefault(str(fi), {})[p['fk']] = (cs, cr, n)
def update(old, cs, cr):
    if rdir and old is not None and cr is not None:
        r = np.clip((cs + 0.02) / (cr + 0.02), 0.5, 2.0) ** 0.8
        return np.clip(old * r, 0.0, 1.3)
    if rdir and old is not None: return old
    return np.clip(cs / 0.85, 0.0, 1.3)
# keep previous values for frames / faces this run does not cover
LI = {k: {fs: v for fs, v in fr.items() if not (f0 <= int(fs) <= f1)} for k, fr in PL.items()}
for kbid, fr in keyed.items():
    for fs, faces in fr.items():
        ent = [-1, -1, -1, -1]
        pv = PL.get(kbid, {}).get(fs, [-1, -1, -1, -1])
        for fk, (cs, cr, n) in faces.items():
            ent[fk] = [round(float(x), 3) for x in update(as4(pv[fk]), cs, cr)]
        LI.setdefault(kbid, {})[fs] = ent
ST = dict(PS)
for fid, lst in stat.items():
    N = sum(n for _, _, n in lst)
    if N < 200: continue
    cs = sum(c * n for c, _, n in lst) / N
    crs = [(c, n) for _, c, n in lst if c is not None]
    cr = sum(c * n for c, n in crs) / sum(n for _, n in crs) if crs else None
    ST[str(fid)] = [round(float(x), 3) for x in update(as4(PS.get(str(fid), -1)), cs, cr)]
open(out, 'w').write(f'// s15 take {key}: measured face values, four corners per face (u,v = 00, 10, 11, 01), from the source frames taken back\n// through the global grade (snapshots/s15-ov/facelight2.py); LIGHTS: keyed box -> frame -> [front, left, right, top],\n// STATIC: face index -> corners\nexport const LIGHTS_{key} = ' + json.dumps(LI, separators=(',', ':')) + f';\nexport const STATIC_{key} = ' + json.dumps(ST, separators=(',', ':')) + ';\n')
print(key, 'keyed boxes', len(LI), 'static faces', len(ST))
