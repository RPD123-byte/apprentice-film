#!/usr/bin/env python3
# mouth2js.py: out/mouth2.json (mouth2.py) -> src/shots/s06/data/mouth.js
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); OUT = os.path.join(ROOT, 'snapshots/s06-r2-src/out')
D = json.load(open(os.path.join(OUT, 'mouth2.json')))
LCAL = D.get('line_cal', 0.0)
def stroke(r):
    flat = []
    for p in r: flat += [round(p[0] * 2) / 2, round(p[1] * 2) / 2, round(p[2], 1), round(p[3], 3), round(p[4], 2)]
    return '[' + ','.join('%g' % f for f in flat) + ']'
def line(run):   # x, y, w, v, b (v shifted by the line calibration)
    return stroke([[o[0], o[1], o[2], min(1, max(0, o[3] + LCAL)), o[4]] for o in run])
def dd(d): return '[' + ','.join('[' + ','.join('%g,%g' % (a, b) for a, b in s) + ']' for s in d) + ']'
lines = ['// The smile of s06, MEASURED on the source (trace/mouthline.py, trace/mouth2.py): the mouth line fitted on every',
         '// source frame (x, y, w, v, b samples), and the neutral fine strokes of the mouth patch (moved in the film by the',
         '// measured flow, data/flow.js). No pixels are stored.',
         'export const PATCH = %s;' % json.dumps([[900, 640], [960, 650], [1060, 655], [1160, 640], [1215, 615], [1255, 620], [1262, 660], [1235, 700], [1160, 758], [1060, 768], [970, 760], [915, 720], [898, 680]]),
         'export const INK = [\n' + ',\n'.join(stroke(r) for r in D['ink']) + '\n];',
         'export const NEUTRAL = { line: %s };' % line(D['neutral_line']),
         'export const SMILE = { line: %s };' % line(D['smile_line']),
         'export const FRAMES = [']
for f in D['frames']: lines.append('  { t: %g, line: %s },' % (f['t'], line(f['line'])))
lines.append('];')
p = os.path.join(ROOT, 'src/shots/s06/data/mouth.js'); open(p, 'w').write('\n'.join(lines) + '\n'); print('->', p, os.path.getsize(p) // 1024, 'KB')
