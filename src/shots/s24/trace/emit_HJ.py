import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SHOT_DIR
import json, os
from emit import tone_js, lines_js
def load(k):
    return json.load(open(f'out/lines_k{k:02d}.json'))
H_KS = [54, 57, 58, 59, 60, 61, 62]; W_KS = [63, 64, 65, 66, 67]; J_KS = [68, 69, 75, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91]
with open(os.path.join(SHOT_DIR, 'dataHJ.js'), 'w') as o:
    o.write('// s24 H (98.96–99.28), whirl (99.32–99.48) and J (99.48–100.44) beats: measured vector data (see\n')
    o.write('// trace/README.md). OWL_H / OWL_J: the held drawings as stacked tone levels (frame px, at their k57 / k75\n')
    o.write('// positions); OWL_W[k]: each in-between drawing of the whirl; LINES[k]: that frame\'s speed lines; OBJ[k]: that\n')
    o.write('// frame\'s loose bright things (glints, stray blades) as tone levels. J frames 70–81 are one frozen frame (75).\n')
    o.write('export const OWL_H = %s;\n' % tone_js(json.load(open('out/owlH.json')), q=2))
    o.write('export const OWL_J = %s;\n' % tone_js(json.load(open('out/owlJ.json')), q=2))
    o.write('export const OWL_W = {\n%s\n};\n' % ',\n'.join('  %d: %s' % (k, tone_js(json.load(open(f'out/owlW{k}.json')), q=2)) for k in W_KS))
    o.write('export const LINES = {\n%s\n};\n' % ',\n'.join('  %d: %s' % (k, lines_js(load(k)['lines'] if k not in (54, 57) else [])) for k in H_KS + W_KS + J_KS))
    o.write('export const GLINT_H = {\n%s\n};\n' % ',\n'.join('  %d: %s' % (k, tone_js(json.load(open(f'out/glintH_k{k:02d}.json')), q=2)) for k in (54, 57, 58, 59)))
    o.write('// k91: the region above the wipe band (the next shot, washed) — traced from the source frame itself\n')
    o.write('export const WIPE91 = %s;\n' % tone_js(json.load(open('out/wipe91.json')), q=2))
    ob = []
    for k in W_KS + J_KS:
        d = load(k)
        if d.get('obj'): ob.append('  %d: %s' % (k, tone_js(d['obj'], q=2)))
    o.write('export const OBJ = {\n%s\n};\n' % ',\n'.join(ob))
print(os.path.getsize(os.path.join(SHOT_DIR, 'dataHJ.js')))
