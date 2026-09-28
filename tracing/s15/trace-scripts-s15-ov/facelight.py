# measured face values for keyed boxes: the mean brightness of each visible keyed face in the SOURCE frame (owl masked),
# taken back through the global grade (vignette, S-curve) to the shader's value; optional refinement against a render.
# usage: facelight.py SET F0 F1 OUT.js [render_dir]   (render_dir: compare.sh output rendered with the current lights)
import json, subprocess, sys, os, glob, re, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm')
from common import SRC, owlmask, FRAMES
from ov import render_ids
HERE = os.path.dirname(os.path.abspath(__file__))
S = 2; W, H = 2206 // S, 946 // S
key, f0, f1, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
rdir = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != '-' else None
FLOOR = True
frames = [f for f in FRAMES if f0 <= f <= f1]
js = json.loads(subprocess.check_output(['node', f'{HERE}/dump.mjs', ','.join(f'{f/25:.2f}' for f in frames), key]))
yy, xx = np.mgrid[0:H, 0:W]
q = np.stack([(xx + 0.5) / W - 0.5, (yy + 0.5) / H - 0.5]) * 2
vig = 1 - 0.38 * np.clip((q[0] ** 2 + q[1] ** 2) / 2, 0, 1) ** 1.15
lut_in = np.linspace(0, 1, 2001); lut_out = lut_in * 0.65 + 0.35 * lut_in * lut_in * (3 - 2 * lut_in)
def inv_s(y): return np.interp(y, lut_out, lut_in)
prev = {}
if os.path.exists(out):
    txt = open(out).read(); m = re.search(r'LIGHTS_\w+ = (\{.*?\});\n', txt, re.S)
    if m: prev = json.loads(m.group(1))
renders = {}
if rdir and not glob.glob(rdir + '/frame-*.png'): sys.exit('no renders in ' + rdir)
if rdir:
    for fp in glob.glob(rdir + '/frame-*.png'):
        t = float(re.search(r'at-([\d.]+)s', fp).group(1)); fi = int(round(np.ceil(t * 25 - 1e-6)))
        renders[fi] = cv2.resize(cv2.imread(fp, 0), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
res = {}
stat = {}
stat_r = {}
for k, d in js.items():
    fi = int(round(d['t'] * 25))
    ib, kb, zb = render_ids(d['polys'])
    src = cv2.resize(cv2.imread(f'{SRC}/f{fi}.png', 0), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
    om = cv2.resize(owlmask(fi, 1.0).astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST) > 0
    # erode each face's visible region a little (edges and seams are ink)
    for p in d['polys']:
        m = (ib == p['id']) & om
        m = cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        if m.sum() < 150: continue
        if p.get('kb') is None:
            if p['kind'] == 'floor' and not FLOOR: continue
            ys = src[m] / 255.0 / vig[m]
            zf = float(np.mean([q[2] for q in p['s']]))
            vv = float(np.clip(inv_s(np.clip(ys, 0, 1)).mean(), 0, 1))
            if zf > 5: vv = min(vv, 0.3)   # far faces: the dark void (their tiny patches pick up the owl's glow)
            stat.setdefault(p['id'], []).append((vv, int(m.sum())))
            if rdir and fi in renders:
                stat_r.setdefault(p['id'], []).append((float(np.clip(inv_s(np.clip(renders[fi][m] / 255.0 / vig[m], 0, 1)).mean(), 1e-3, 1)), int(m.sum())))
            continue
        ys = src[m] / 255.0 / vig[m]
        v = float(np.clip(inv_s(np.clip(ys, 0, 1)).mean(), 0, 1))
        ent = res.setdefault(p['kb'], {}).setdefault(str(fi), [-1, -1, -1, -1])
        if rdir and fi in renders:
            old = prev.get(p['kb'], {}).get(str(fi), [-1, -1, -1, -1])[p['fk']]
            rv = float(np.clip(inv_s(np.clip(renders[fi][m] / 255.0 / vig[m], 0, 1)).mean(), 1e-3, 1))
            if old >= 0: v = float(np.clip(old * (v / rv) ** 0.8, 0.02, 1.2))
            else: v = v / 0.85
        elif not rdir:
            v = v / 0.85   # first guess: the engraving darkens a face by ~15% on average
        else:
            old = prev.get(p['kb'], {}).get(str(fi), [-1, -1, -1, -1])[p['fk']]
            v = old if old >= 0 else v / 0.85
        ent[p['fk']] = round(v, 3)
# static faces: a single value per face = the pixel-weighted mean over the frames where it shows
sres = {}
pst = {}
m2 = re.search(r'STATIC_\w+ = (\{.*?\});', open(out).read(), re.S) if os.path.exists(out) else None
if m2: pst = json.loads(m2.group(1))
for fid, vals in stat.items():
    wsum = sum(w for _, w in vals)
    if wsum < 600: continue
    v = sum(x * w for x, w in vals) / wsum
    old = pst.get(str(fid), -1)
    if rdir and fid in stat_r and old >= 0:
        rv = sum(x * w for x, w in stat_r[fid]) / sum(w for _, w in stat_r[fid])
        v = float(np.clip(old * (v / rv) ** 0.8, 0.02, 1.2))
    elif rdir and old >= 0: v = old
    else: v = v / 0.85
    sres[str(fid)] = round(v, 3)
open(out, 'w').write(f'// s15 take {key}: measured face values of the keyed boxes (mean brightness of each face in the source frame,\n// taken back through the global grade; snapshots/s15-ov/facelight.py), {{ box: {{ frame: [front, left, right, top] }} }}\nexport const LIGHTS_{key} = ' + json.dumps(res, separators=(',', ':')) + f';\nexport const STATIC_{key} = ' + json.dumps(sres, separators=(',', ':')) + ';\n')
print('boxes', len(res), 'entries', sum(len(v) for v in res.values()), 'static faces', len(sres))
