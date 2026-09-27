# shell_tojs.py shell.json ../shell.js  — control points of trace_shell.py as a JS module
import json, sys
d = json.load(open(sys.argv[1]))
f = lambda L: '[' + ', '.join(f'{p[0]}, {p[1]}, {p[2]}, {p[3]}' for p in L) + ']'
with open(sys.argv[2], 'w') as o:
  o.write('// The s12 hero\'s lower headphone shell (source frame 34.0 s), fix pass 3 — control points only, written by\n'
          '// trace/trace_shell.py + shell_tojs.py: the long streaks that follow the rim, followed along the measured streak flow.\n'
          '// SHELL.base: [c0, [x, y, sigma, amp]...] the tone between the streaks (pre-finish 0..1), below y0;\n'
          '// SHELL.dark / SHELL.lit: centre-lines [x, y, FWHM px, core value, ...].\n')
  o.write('export const SHELL = {\n')
  o.write(f'  y0: {d["y0"]},\n  base: [{d["c0"]}, {json.dumps(d["base"])}],\n')
  o.write('  dark: [\n' + ',\n'.join('    ' + f(L) for L in d['dark']) + '\n  ],\n')
  o.write('  lit: [\n' + ',\n'.join('    ' + f(L) for L in d['lit']) + '\n  ],\n};\n')
