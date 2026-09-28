import ast, json, numpy as np
X = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
def load(fns):
    d = {}
    for fn in fns:
        for l in open(X + fn + '.log'):
            if l.startswith('{'): r = ast.literal_eval(l); d[r['f']] = r
    return d
room = load(['cr-a', 'cr-b', 'cr-c', 'cr-d', 'cr-e']); room3 = load(['c3-a', 'c3-b', 'c3-c'])
des = load(['cfd-a', 'cfd-b', 'cfd-c']); owl = load(['cf-owl'])
F0, F1 = 264, 477
# ---- camera fix: the room fit's shift where it saw enough of the sharp views (n > 100k), else the designer's
fix = {}
for f in range(F0, F1 + 1):
    r = room.get(f); d = des.get(f)
    if r and r['n'] > 100000: fix[f] = (r['sx'], r['sy'])
    elif d and d['n'] > 100000: fix[f] = (d['sx'], d['sy'])
for f in (477,): fix[f] = fix.get(476, (0, 0))
# 450-455: only the beanie's corner is in view (n < 100k): the fits agree on about (+12, -11)
for f in range(446, 456):
    if f not in fix:
        r = room.get(f) or des.get(f)
        if r and r['n'] > 10000: fix[f] = (r['sx'], r['sy'])
known = sorted(fix)
cf = []
for f in range(F0, F1 + 1):
    if f in fix: v = fix[f]
    elif 362 <= f <= 413: v = (0.0, 0.0)          # the hold: the camera is the carton view itself
    else:
        a = max([k for k in known if k < f], default=None); b = min([k for k in known if k > f], default=None)
        if a is None or b is None or b - a > 40: v = (0.0, 0.0)
        else: u = (f - a) / (b - a); v = (fix[a][0] * (1 - u) + fix[b][0] * u, fix[a][1] * (1 - u) + fix[b][1] * u)
    cf.append(v)
# the room (the two sharp views): fitted [L, sigma]; where the fit ran into the grid's cap (the source has no hatching
# left there at all) the wide-grid refit caps at sigma 4 (edges stay firmer in the source than a wider gaussian)
rb = []
for f in range(F0, F1 + 1):
    if 362 <= f <= 413: rb.append((0, 0)); continue
    r = room.get(f)
    if f in room3 and (r is None or r['L'] >= 26): r = room3[f]
    if r is None or r['n'] < 60000 or r['L'] >= 26 and r['s'] >= 3.4:
        if 313 <= f <= 337 or 446 <= f <= 464: rb.append((26, 4.0)); continue
        if r is None: rb.append(None); continue
    rb.append((min(30, r['L']), min(4.0, r['s'])))
for i, v in enumerate(rb):
    if v is None:
        a = next(rb[j] for j in range(i - 1, -1, -1) if rb[j] is not None); rb[i] = a
# the designer: fitted [L, sigma] (the look drawing, masked to his silhouette); where he is nearly out of view
# (n < 100k) the neighbours' values
db = []
for f in range(F0, F1 + 1):
    d = des.get(f)
    if d and d['n'] > 100000 and not (d['L'] >= 26 and d['s'] >= 3.4): db.append((d['L'], d['s']))
    else: db.append(None)
for i, v in enumerate(db):
    if v is None:
        prv = next((db[j] for j in range(i - 1, -1, -1) if db[j] is not None), None); nxt = next((db[j] for j in range(i + 1, len(db)) if db[j] is not None), None)
        db[i] = prv if prv is not None and (nxt is None or F0 + i < 400) else nxt
# the sitting owl on the arrival (348-361): fitted on its own region
ob = []
for f in range(348, 362):
    o = owl.get(f) or owl[355]; ob.append((o['L'], o['s']))
fl = lambda a: ','.join(('%.1f' % x).rstrip('0').rstrip('.') for p in a for x in p)
js = f"""// s02 per-frame measurements (fix pass 1, scratch scripts charfit*.py / blurfit*.py; see fidelity/s02.md):
// each pan frame fitted against the sharp stare view (the look, frames 225-262) or the carton hold (362-379), in paint
// values: a global shift, a smear L along the pan and a gaussian sigma, separately for the room (everything but the
// characters), the designer (his silhouette) and the sitting owl.
// CAMFIX: [dx, dy] added to cam.js's chained track (frames {F0}..{F1}); ROOMB / DESB / OWLB: [L, sigma] per frame.
export const CAMFIX0 = {F0};
export const CAMFIX = [{fl(cf)}];
export const ROOMB0 = {F0};
export const ROOMB = [{fl(rb)}];
export const DESB0 = {F0};
export const DESB = [{fl(db)}];
export const OWLB0 = 348;
export const OWLB = [{fl(ob)}];
// the pan mosaic already carries the pans' blur (it is averaged from these frames): it gets only what the room needs
// beyond MOSB = [L, sigma] (in quadrature), fitted on the mosaic-only parts of frames 300-346 / 440-464
export const MOSB = [14, 2.5];
"""
open('/Users/computer/rootline/apprentice-film/src/shots/s02/track.js', 'w').write(js)
for f in range(F0, F1 + 1, 4): print(f, cf[f - F0], rb[f - F0], db[f - F0])
