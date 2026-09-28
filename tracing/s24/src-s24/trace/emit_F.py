import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SHOT_DIR
import json, glob, os, sys
import numpy as np, cv2
from emit import tone_js, lines_js
from tone import raster
LV_KEEP = None
owl = json.load(open('out/owlF.json'))
lines = {}; objs = {}; uniq = []
def split(obj, xsplit=640):
    A, B = [], []
    for l in obj:
        la = {'t': l['t'], 'v': l['v'], 'paths': []}; lb = {'t': l['t'], 'v': l['v'], 'paths': []}
        for p in l['paths']:
            (la if np.mean(np.array(p)[:, 0]) < xsplit else lb)['paths'].append(p)
        A.append(la); B.append(lb)
    return A, B
def ras(L):
    ps = [np.array(p) for l in L for p in l['paths']]
    if not ps: return None, None
    allp = np.vstack(ps); x0, y0 = np.floor(allp.min(0)).astype(int) - 4; x1, y1 = np.ceil(allp.max(0)).astype(int) + 4
    Lr = [{'v': l['v'], 'paths': [np.array(p) - [x0, y0] for p in l['paths']]} for l in L]
    return raster(Lr, (y1 - y0, x1 - x0), ss=1), (x0, y0)
THR = float(os.environ.get('DUPTHR', 0.93))
ref = {}   # k -> {'A': ('own'|(j, dx, dy))}
for f in sorted(glob.glob('out/lines_k*.json')):
    d = json.load(open(f)); k = d['k']
    if not (23 <= k <= 53): continue
    lines[k] = lines_js(d['lines'])
    if not d.get('obj'): continue
    for gname, L in zip('AB', split(d['obj'])):
        im, org = ras(L)
        if im is None: continue
        best = None
        for (j, gj, imj, orgj) in uniq:
            if gj != gname: continue
            m = 12
            if im.shape[0] <= 2 * m + 8 or im.shape[1] <= 2 * m + 8: continue
            H = max(imj.shape[0], im.shape[0]) + 2 * m; W = max(imj.shape[1], im.shape[1]) + 2 * m
            big = np.zeros((H, W), np.float32); big[m:m + imj.shape[0], m:m + imj.shape[1]] = imj
            # place im's origin relative to imj's origin
            ox, oy = org[0] - orgj[0], org[1] - orgj[1]
            if abs(ox) > 60 or abs(oy) > 60: continue
            tpl = im[m:-m, m:-m]
            r = cv2.matchTemplate(cv2.GaussianBlur(big, (0, 0), 1.2), cv2.GaussianBlur(tpl, (0, 0), 1.2), cv2.TM_CCOEFF_NORMED)
            _, mx, _, loc = cv2.minMaxLoc(r)
            if best is None or mx > best[0]:
                S = (org[0] - orgj[0] - loc[0] + 2 * m, org[1] - orgj[1] - loc[1] + 2 * m)
                best = (mx, j, S)
        if best and best[0] >= THR:
            ref.setdefault(k, {})[gname] = (int(best[1]), int(best[2][0]), int(best[2][1]), round(float(best[0]), 3))
        else:
            uniq.append((k, gname, im, org))
            objs.setdefault(k, {})[gname] = tone_js(L, q=2)
            ref.setdefault(k, {})[gname] = 'own'
print(json.dumps({k: v for k, v in ref.items()}))
with open(os.path.join(SHOT_DIR, 'dataF.js'), 'w') as o:
    o.write('// s24 F beat (97.76–98.92): measured vector data (see trace/README.md). OWL_F: the angry owl as stacked\n')
    o.write('// tone levels in k53 frame px (the drawing only translates: ftrack); LINES_F[k]: that frame\'s speed lines;\n')
    o.write('// SC_F[k] = {A, B}: that frame\'s scissors (+ glints) as tone levels in frame px, or [j, dx, dy] = frame j\'s\n')
    o.write('// drawing shifted (the source reuses its spin drawings).\n')
    o.write('export const OWL_F = %s;\n' % tone_js(owl, q=2))
    tr = json.load(open('ftrack.json')); tr['23'] = tr['24']
    o.write('// the drawing\'s shift from its k53 position, per frame k (template match on the head, 1/100 px)\n')
    o.write('export const F_SHIFT = {%s};\n' % ', '.join('%s: [%.2f, %.2f]' % (k, v[0], v[1]) for k, v in sorted(tr.items(), key=lambda a: int(a[0]))))
    o.write('export const LINES_F = {\n%s\n};\n' % ',\n'.join('  %d: %s' % (k, v) for k, v in sorted(lines.items())))
    ents = []
    for k in sorted(ref):
        parts = []
        for gname, r in sorted(ref[k].items()):
            parts.append('%s: %s' % (gname, objs[k][gname] if r == 'own' else '[%d, %d, %d]' % (r[0], r[1], r[2])))
        ents.append('  %d: { %s }' % (k, ', '.join(parts)))
    o.write('export const SC_F = {\n%s\n};\n' % ',\n'.join(ents))
print(os.path.getsize(os.path.join(SHOT_DIR, 'dataF.js')))
