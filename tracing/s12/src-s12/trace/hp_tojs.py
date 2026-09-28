#!/usr/bin/env python3
# hp_tojs.py hp.json ../hp.js  -> the measured headphone control points as a JS module
import json, sys
d = json.load(open(sys.argv[1]))
f = lambda v: ('%g' % v)
with open(sys.argv[2], 'w') as o:
  o.write('// Measured near-headphone cup of the s12 hero (source frame 34.0 s) — control points only, no pixels.\n')
  o.write('// Written by trace/trace_hp.py + trace/hp_tojs.py. hero.js redraws them:\n')
  o.write('//   HP_LINES  white scratchboard lines [x,y,w,...] following the measured engraving flow of the shell/yoke/rim\n')
  o.write('//   HP_WEDGES lit fold-wedge outlines of the leather cushion;  HP_DOTS pale cushion dots [x,y,r,v]\n')
  o.write('//   HP_TONE   quadratic tone of the plate halftone in (u=(x-cx)/rx, v=(y-cy)/ry): [1,u,v,uu,uv,vv]\n')
  o.write('export const HP_LINES = [\n' + ',\n'.join('[' + ','.join(f(c) for p in r for c in p) + ']' for r in d['lines']) + '];\n')
  o.write('export const HP_CUSH_LINES = [\n' + ',\n'.join('[' + ','.join(f(c) for p in r for c in p) + ']' for r in d['cush']) + '];\n')
  o.write('export const HP_WEDGES = ' + json.dumps(d['wedges'], separators=(',', ':')) + ';\n')
  o.write('export const HP_DOTS = ' + json.dumps(d['dots'], separators=(',', ':')) + ';\n')
  o.write('export const HP_TONE = ' + json.dumps(d['plate']) + ';\n')
  for k in ('E', 'HA', 'PLATE', 'RING', 'K', 'CUSH'): o.write('export const HP_%s = %s;\n' % (k, json.dumps(d[k], separators=(',', ':'))))
