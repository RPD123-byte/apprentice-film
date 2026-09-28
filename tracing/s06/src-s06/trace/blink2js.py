#!/usr/bin/env python3
# blink2js.py: snapshots/s06-r2-src/out/owl_blink.json (trace/blink.py, calibrated) -> src/shots/s06/data/owl_blink.js
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); OUT = os.path.join(ROOT, 'snapshots/s06-r2-src/out')

def ring_js(r): return '[' + ','.join('%g,%g' % (p[0], p[1]) for p in r) + ']'
CAL = {}
def vcal(layer, it): return min(1, max(0, it['v'] + CAL.get(layer, {}).get(str(it.get('l')), [0, 0])[0]))
def items_js(items, layer=''): return '[' + ','.join('[%g,%s]' % (round(vcal(layer, it), 3), ','.join(ring_js(r) for r in it['rings'])) for it in items) + ']'
D = json.load(open(os.path.join(OUT, 'owl_blink.json'))); CAL = D.get('cal', {})
lines = ['// The owl blink of s06, MEASURED per source frame 28.04-28.52 (trace/blink.py): the head transform vs 27.92',
         '// (warp: a, b, tx, c, d, ty maps the neutral head to that frame) and a value study of the two eye patches in',
         '// neutral-head coordinates (ground levels painted dark to light, then dark levels). No pixels are stored.',
         'export const PATCH = %s;' % json.dumps(D['patch']), 'export const BLINK = [']
for f in D['frames']:
    lines.append('  { t: %g, warp: %s, ground: %s, dark: %s },' % (f['t'], json.dumps(f['warp']), items_js(f['mass'].get('ground', []), 'ground'), items_js(f['mass'].get('dark', []), 'dark')))
lines.append('];')
for k in ('pre', 'post'):
    if k in D: lines.append('export const %s = { ground: %s, dark: %s };' % (k.upper(), items_js(D[k].get('ground', []), 'ground'), items_js(D[k].get('dark', []), 'dark')))
p = os.path.join(ROOT, 'src/shots/s06/data/owl_blink.js'); open(p, 'w').write('\n'.join(lines) + '\n'); print('->', p, os.path.getsize(p) // 1024, 'KB')
