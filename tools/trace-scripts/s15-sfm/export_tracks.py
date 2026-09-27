# export tracked corner files tr<PFX>*.json -> src/shots/s15/tracks<PFX>.js (measured positions only)
import json, glob, re, sys
pfx = sys.argv[1]
base = '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm/'
out = {}
for fn in sorted(glob.glob(base + f'tr{pfx}[0-9]*.json')):
    name = re.search(r'(tr' + pfx + r'\d+)\.json', fn).group(1)
    d = json.load(open(fn)); fr = d['frames']; f0 = min(fr); f1 = max(fr)
    p = []
    for f in range(f0, f1 + 1):
        p.append([[round(x * 2) / 2, round(y * 2) / 2] for x, y in d['T'][str(f)]] if str(f) in d['T'] else None)
    for i in range(len(p)):
        if p[i] is None: p[i] = p[i - 1]
    out[name] = {'f0': f0, 'p': p}
open(f'/Users/computer/rootline/apprentice-film/src/shots/s15/tracks{pfx}.js', 'w').write(f'// s15 take {pfx}: corner positions tracked on the source frames (frame px; frame index = film time x 25), see keyed.js\nexport const TRACKS_{pfx} = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print({k: (v['f0'], len(v['p'])) for k, v in out.items()})
