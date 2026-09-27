import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SHOT_DIR
import json, os
from emit import tone_js
H = json.load(open('out/hold.json'))
with open(os.path.join(SHOT_DIR, 'dataPage.js'), 'w') as o:
    o.write('// s24 page beats: what the source adds to the framed page, traced as grey tone levels in frame px (see\n')
    o.write('// trace/README.md). PAGE_A: k7 (97.08) — the three motion-smeared owls. PAGE_B1..3: the k8–18 hold\n')
    o.write('// (97.12–97.52, traced on the median frame) — the big owl slashing with scissors + its smoke, the top-left owl,\n')
    o.write('// the bottom-right owl. HOLD: the hold is not still — each owl slides (sub-pixel template shifts per frame k8..18)\n')
    o.write('// and each confetti piece i drifts by D[i]·f[k] (one shared ease profile f, index 0 = k7, 1..11 = k8..18).\n')
    o.write('export const PAGE_A = %s;\n' % tone_js(json.load(open('out/pageA.json')), q=2))
    for g in ('B1', 'B2', 'B3'):
        o.write('export const PAGE_%s = %s;\n' % (g, tone_js(json.load(open(f'out/page{g}.json')), q=2)))
    owl = {g: [H['owl'][g][str(k)][:2] for k in range(8, 19)] for g in ('B1', 'B2', 'B3')}
    o.write('export const HOLD = %s;\n' % json.dumps({'owl': owl, 'f': H['f'], 'D': H['D']}, separators=(',', ':')))
    sm = json.load(open('out/smoke.json'))
    o.write('// the extra smoke of k8–9 (fades by k10): additive tone levels (pre-grade grey), strength per frame k8..18\n')
    o.write('export const SMOKE = %s;\n' % tone_js(sm['levels'], q=2))
    o.write('export const SMOKE_A = %s;\n' % json.dumps([sm['a'][str(k)] for k in range(8, 19)]))
print(os.path.getsize(os.path.join(SHOT_DIR, 'dataPage.js')))
