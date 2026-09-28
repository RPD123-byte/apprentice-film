#!/usr/bin/env python3
# exact-frame lab: lab.py FRAMES(outdir) e.g. lab.py 151,200,300 snapshots/s02-fix1r-x   (frames as list or a..b[:step])
import sys, os, subprocess, shutil, glob, re
ROOT = '/Users/computer/rootline/apprentice-film'; LAB = ROOT + '/snapshots/s02-fix1r-lab' + os.environ.get('LABN', '')
if not os.path.exists(LAB):
    os.makedirs(LAB); base = ROOT + '/snapshots/s02-fix1r-lab'
    for fn in ('index.tpl', 'hyperframes.json', 'meta.json'): shutil.copy(base + '/' + fn, LAB + '/' + fn)
    os.symlink('../../src', LAB + '/src')
def parse(s):
    out = []
    for part in s.split(','):
        if '..' in part:
            a, b = part.split('..'); st = 1
            if ':' in b: b, st = b.split(':'); st = int(st)
            out += list(range(int(a), int(b) + 1, st))
        elif part: out.append(int(part))
    return out
F = parse(sys.argv[1]); OUT = os.path.join(ROOT, sys.argv[2]); os.makedirs(OUT, exist_ok=True)
tpl = open(LAB + '/index.tpl').read()
B = int(os.environ.get('BATCH', 40))
for b0 in range(0, len(F), B):
    fb = F[b0:b0 + B]
    open(LAB + '/index.html', 'w').write(tpl.replace('__FRAMES__', ','.join(map(str, fb))))
    tmp = LAB + '/_out'; shutil.rmtree(tmp, ignore_errors=True)
    at = ','.join(f'{k + 0.5}' for k in range(len(fb)))
    r = subprocess.run(['npx', '--yes', 'hyperframes@0.8.69', 'snapshot', LAB, '--at', at, '--no-end', '--describe', 'false', '--timeout', '60000', '-o', tmp], capture_output=True, text=True)
    pngs = sorted(glob.glob(tmp + '/*.png'))
    if len(pngs) != len(fb):
        print('batch', b0, 'got', len(pngs), 'of', len(fb)); print(r.stdout[-2000:], r.stderr[-2000:])
    def key(p):
        m = re.search(r'(\d+(?:\.\d+)?)s', os.path.basename(p)); return float(m.group(1)) if m else 0
    pngs.sort(key=key)
    for f, p in zip(fb, pngs): shutil.move(p, f'{OUT}/r{f:04d}.png')
    print('batch', b0, len(pngs), flush=True)
