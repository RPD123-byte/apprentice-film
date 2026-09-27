#!/usr/bin/env python3
# build.py NAME [NAME...] [--export] : trace (or with --export only re-export) the sets named in trace/cfg/NAME.json.
# A set = optional dark strokes ("ink"), pale strokes ("light") and tonal masses ("mass"); the intermediate JSON goes to
# snapshots/s06-r2-src/out/ (calibrate.py edits it there), the film's data module to src/shots/s06/data/NAME.js.
import json, os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(SRC, 'out')
os.makedirs(OUT, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith('--')]; export_only = '--export' in sys.argv
HDR = {
 'ink': 'dark ink strokes: centre-lines (trace.py: Hessian ridge, hysteresis, skeleton, re-joined, RDP), x y w v b per point',
 'light': 'pale strokes (trace.py, bright mode), x y w v b per point',
 'mass': 'tonal masses (masses.py): outlines at a few levels, [v, ring, ...] per item, filled even-odd',
 'dots': 'small pale marks (dots.py): x, y, length, width, direction, ungraded value, ground per dot',
}
def fmt_strokes(res):
    rows = []
    for r in res:
        flat = []
        for p in r:
            x, y, w, v, b = p[:5]; flat += [round(x * 2) / 2, round(y * 2) / 2, round(w, 1), round(v, 3), round(b, 2)]
        rows.append('[' + ','.join('%g' % f for f in flat) + ']')
    return '[\n' + ',\n'.join(rows) + '\n]'
def fmt_mass(res):
    parts = []
    for k, items in res.items():
        rows = []
        for it in items:
            rings = ['[' + ','.join('%g,%g' % (p[0], p[1]) for p in r) + ']' for r in it['rings']]
            rows.append('[%g,%s]' % (round(it['v'], 3), ','.join(rings)))
        parts.append('  %s: [\n    %s,\n  ]' % (k, ',\n    '.join(rows)))
    return '{\n' + ',\n'.join(parts) + ',\n}'
for name in args:
    cfg = json.load(open(os.path.join(HERE, 'cfg', name + '.json')))
    for part in ('ink', 'light', 'mass', 'dots'):
        if part not in cfg: continue
        c = dict(cfg[part]); cp = os.path.join(OUT, f'{name}.{part}.cfg.json')
        for k in ('src', 'mask_src'):
            if k in c and not os.path.isabs(c[k]): c[k] = os.path.join(SRC, c[k])
        json.dump(c, open(cp, 'w'))
        o = os.path.join(OUT, f'{name}.{part}.json')
        if not export_only or not os.path.exists(o):
            tool = 'masses.py' if part == 'mass' else 'dots.py' if part == 'dots' else 'trace.py'
            r = subprocess.run(['python3', os.path.join(HERE, tool), cp, o, os.path.join(OUT, f'{name}.{part}.dbg.png')], capture_output=True, text=True)
            print(name, part, (r.stdout + r.stderr).strip().splitlines()[-1:] if (r.stdout + r.stderr).strip() else '')
    js = [f'// s06 {name}: MEASURED on the source (mean of frames 26.76-27.04, ungraded with trace/grade.py) by the scripts in',
          f'// src/shots/s06/trace/ (config trace/cfg/{name}.json), values calibrated against renders (trace/calibrate.py).',
          '// Positions, widths and values only - no source pixels are stored. Regenerate: trace/build.py ' + name]
    for part, nm in (('ink', 'INK'), ('light', 'LIGHT'), ('mass', 'MASS'), ('dots', 'DOTS')):
        o = os.path.join(OUT, f'{name}.{part}.json')
        if part in cfg and os.path.exists(o):
            d = json.load(open(o))
            js.append(f'// {nm}: {HDR[part]}')
            if part == 'dots': js.append('export const DOTS = [' + ','.join('%g' % v for dd in d for v in (dd[0], dd[1], dd[2], dd[3], dd[4], round(dd[5], 3), round(dd[6], 3))) + '];')
            else: js.append(f'export const {nm} = ' + (fmt_mass(d) if part == 'mass' else fmt_strokes(d)) + ';')
        else:
            js.append(f'export const {nm} = ' + ('{}' if part == 'mass' else '[]') + ';')
    p = os.path.join(ROOT, 'src/shots/s06/data', name + '.js')
    open(p, 'w').write('\n'.join(js) + '\n'); print('->', p, os.path.getsize(p) // 1024, 'KB')
