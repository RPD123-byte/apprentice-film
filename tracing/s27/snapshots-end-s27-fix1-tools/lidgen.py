# Write src/shots/s27/lidback.js from the source fit (lidfit_src.json) and the pre-grade colours.
#   lidgen.py init                 pre-grade guess by inverting the S-curve and vignette (no halation)
#   lidgen.py iter MEAS.json       multiply the current pre-grade colours by source / render (region medians / corner fits)
import json, sys, numpy as np
W = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-work'
OUT = '/Users/computer/rootline/apprentice-film/src/shots/s27/lidback.js'
US = [round(x, 4) for x in list(np.linspace(0, 0.8, 11)) + list(np.linspace(0.84, 1, 9))]
fit = {int(k): v for k, v in json.load(open(f'{W}/lidfit_src.json')).items()}
def clean(F, vb):
    if F == 3217: F, vb = 3218, fit[3218]['vb']      # 128.68: the lid is a sliver there, its own fit is unusable
    vb = list(vb)
    if F in (3217, 3218): vb = [0.0 if u < 0.1 else v for u, v in zip(US, vb)]
    vb = [0.0 if v < 0.052 else v for v in vb]
    out, m = [], 0.0
    for v in vb: m = max(m, v); out.append(m)
    return out
def smooth_all(st):
    # spatial [1 2 1] (ends kept) then temporal [1 2 1] over neighbouring frames: the per-frame fits carry ~1-2 % noise
    Fs = sorted(st)
    for F in Fs:
        v = np.array(st[F]['vb0']); s = v.copy(); s[1:-1] = 0.25 * v[:-2] + 0.5 * v[1:-1] + 0.25 * v[2:]
        s[v == 0] = 0; st[F]['vbs'] = s
    for i, F in enumerate(Fs):
        a = st[Fs[max(0, i - 1)]]['vbs']; b = st[F]['vbs']; c = st[Fs[min(len(Fs) - 1, i + 1)]]['vbs']
        v = b if i in (0, len(Fs) - 1) else 0.25 * a + 0.5 * b + 0.25 * c
        v[b == 0] = 0
        st[F]['vb'] = [round(float(x), 3) for x in np.maximum.accumulate(v)]
    for F in Fs: st[F].pop('vbs', None)
X = np.linspace(0, 1, 4096); Y = X * 0.65 + 0.35 * X * X * (3 - 2 * X)
def pre(c, vg=0.969):
    return [float(np.interp(min(1, max(0, v / 255 / vg)), Y, X) * 255) for v in c]
state_p = f'{W}/lidgen_state.json'
if sys.argv[1] == 'init':
    st = {}
    for F, r in fit.items():
        st[F] = {'vb0': clean(F, r['vb']), 'light': pre(r['light']) if r['light'] else None, 'dark': [pre([min(255, max(0, x)) for x in c]) for c in r['dark']]}
else:
    st = {int(k): v for k, v in json.load(open(state_p)).items()}
    meas = {int(k): v for k, v in json.load(open(sys.argv[2])).items()}
    for F, s in st.items():
        r, m = fit[F], meas.get(F)
        if not m: continue
        if s['light'] and m['light'] and r['light']:
            s['light'] = [min(255, max(0, a * (b + 1) / (c + 1))) for a, b, c in zip(s['light'], r['light'], m['light'])]
        s['dark'] = [[min(255, max(0, a * (min(255, max(0, b)) + 1) / (min(255, max(0, c)) + 1))) for a, b, c in zip(sd, rd, md)] for sd, rd, md in zip(s['dark'], r['dark'], m['dark'])]
if sys.argv[1] == 'init': smooth_all(st)
json.dump(st, open(state_p, 'w'))
rows = []
for F in sorted(st):
    s = st[F]; lt = s['light'] or [0, 0, 0]
    rows.append('  [%.2f, %s, [%s], %s]' % (F / 25, json.dumps(s['vb']), ','.join('%d' % round(v) for v in lt) if s['light'] else '', json.dumps([[round(v) for v in c] for c in s['dark']])))
with open(OUT, 'w') as f:
    f.write('// s27 lid back as the camera swings past it (end-s27-fix1): the sunlit patch in its upper right and the darker face,\n')
    f.write('// fitted per source frame 128.68-129.28 in lid-back coordinates (u: image-left edge -> image-right edge of the lid seen\n')
    f.write('// from behind, v: top -> bottom) with the shot\'s own lid mapping. Vector data only: the patch is the region above the\n')
    f.write('// boundary v_b(u) (sampled at LB_U), one flat colour; the face is a bilinear colour field (corners TL, TR, BR, BL).\n')
    f.write('// Colours are pre-grade (fitted through the film grade). Scripts: snapshots/end-s27-fix1-tools (lidfit2.py, lidgen.py).\n')
    f.write('// LIDBACK: [t, v_b[20], patch rgb ([] = none), [TL, TR, BR, BL] rgb]\n')
    f.write('export const LB_U = %s;\n' % json.dumps(US))
    f.write('export const LIDBACK = [\n' + ',\n'.join(rows) + '\n];\n')
print('wrote', OUT, len(rows))
