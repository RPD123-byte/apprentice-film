# Build src/shots/s07/imagGlyphs.js: outlines of the letters of "Imagination" from the OFL font Fraunces
# (assets/fonts/Fraunces-Variable.ttf) at fixed variation instances, as SVG path strings in font units (y up,
# 1000/em) plus advance widths. Canvas cannot select a variable font's SOFT/opsz axes, so the soft low-contrast cut
# that reads closest to the source's retro lettering is instanced here. Not loaded by the film; its output is.
import json, sys, re
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
SRC = 'assets/fonts/Fraunces-Variable.ttf'
INST = {k: dict(zip(['opsz', 'wght', 'SOFT', 'WONK'], v)) for k, v in {
  'soft9_900': (9, 900, 100, 0)}.items()}
out = {}
for name, loc in INST.items():
  f = instancer.instantiateVariableFont(TTFont(SRC), loc)
  gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
  d = {}
  for ch in sorted(set('Imagination')):
    gn = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[gn].draw(pen)
    cmd = re.sub(r'-?\d+\.\d+', lambda m: ('%.1f' % float(m.group(0))).rstrip('0').rstrip('.'), pen.getCommands())
    d[ch] = [round(gs[gn].width * 1000 / upm, 2), cmd]
  out[name] = {'upm': upm, 'g': d}
with open('src/shots/s07/imagGlyphs.js', 'w') as fh:
  fh.write('// Letter outlines for "Imagination" from the OFL font Fraunces at soft instances (src/shots/s07/tools/glyphs.py).\n')
  fh.write('// [advance (1/1000 em), SVG path in font units, y up]. Generated; do not edit by hand.\n')
  fh.write('// Outlines from Fraunces: Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces),\n')
  fh.write('// licensed under the SIL Open Font License, Version 1.1 (https://scripts.sil.org/OFL).\n')
  fh.write('export const IMAG_GLYPHS = ' + json.dumps(out) + ';\n')
print({k: len(json.dumps(v)) for k, v in out.items()})
