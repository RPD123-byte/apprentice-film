import sys, time
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import build, Lab
html = build('entry_pf.js', 'entry_pf.b.js')
L = Lab(html)
def T(t, flags, n=6):
    L.p.evaluate('(f) => { for (const k of Object.keys(window.DBGO)) delete window.DBGO[k]; Object.assign(window.DBGO, f); }', flags)
    ms = []
    for i in range(n):
        ms.append(L.p.evaluate('(t) => { const c = document.createElement("canvas"); return 0; }', t) or 0)
        r = L.p.evaluate('([t]) => { const T0 = performance.now(); window.R(t, {raw: true}); return performance.now() - T0; }', [t + 0.04 * (i % 2)])
        ms.append(r)
    ms = sorted(ms[1::2])
    return ms[len(ms) // 2]
for t in [76.0, 78.4, 80.4, 82.4, 83.6]:
    T(t, {}, 2)
    base = T(t, {})
    out = [f'{t}: all {base:.0f}']
    for name, f in [('noGain', {'noGain': True}), ('pool0', {'pool': 0}), ('own0', {'ownGlow': 0, 'edgeOwn': 0}), ('noLines', {})]:
        out.append(f'{name} {T(t, f):.0f}')
    print(' | '.join(out), flush=True)
L.close()
