# per-glyph skew refinement starting from fit-Shrikhand.json
import json, numpy as np, sys
src = open('fit_hl.py').read().split('best = None')[0]
sys.argv = ['x', 'Shrikhand.ttf']
exec(src)
J = json.load(open('fit-Shrikhand.json')); k0 = J['skew']
out = []; tot = 0
boxes = [b for line in (L1, L2) for b in line]
for (ch, *box), (ch2, p, iou) in zip(boxes, J['glyphs']):
    if ch not in G: G[ch] = glyph(ch)
    def f(q):
        return score(ch, box, q[:5], q[5])
    r = minimize(f, p + [k0], method='Powell', options={'xtol': 0.03, 'ftol': 1e-5, 'maxfev': 3000})
    out.append((ch, [float(v) for v in r.x], float(1 - r.fun))); tot += 1 - r.fun
    print(ch, np.round(r.x, 3), 'IoU %.3f (was %.3f)' % (1 - r.fun, iou)); sys.stdout.flush()
print('mean', tot / len(out))
json.dump({'font': 'Shrikhand.ttf', 'skew': k0, 'glyphs': out}, open('fit-Shrikhand2.json', 'w'), indent=1)
