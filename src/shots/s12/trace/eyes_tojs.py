#!/usr/bin/env python3
# eyes_tojs.py eyes.json ../eyes.js -> the measured eye ink (outline rings per ink level) as a JS module
import json, sys
d = json.load(open(sys.argv[1]))
with open(sys.argv[2], 'w') as o:
  o.write('// Measured eye ink of the s12 hero for its three drawings (source frames 850 / 880 / 882), control points only.\n')
  o.write('// Written by trace/trace_eyes.py + trace/eyes_tojs.py. Per drawing: dark = outline rings of the black (pupil, lid,\n')
  o.write('// ring; fill even-odd); grey = [value, rings] soft-ink levels, light to dark. Frame px of that drawing.\n')
  o.write('export const EYES = {\n')
  for st in ('stare', 'glare', 'closed'):
    e = d[st]
    o.write('  %s: {\n    dark: %s,\n    grey: %s,\n  },\n' % (st, json.dumps(e['dark'], separators=(',', ':')), json.dumps(e['grey'], separators=(',', ':'))))
  o.write('};\n')
