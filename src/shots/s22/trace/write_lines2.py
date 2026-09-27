#!/usr/bin/env python3
# Fix pass 2: writes ../lines2.js from resid_lines.py's output plus the walk's hand-measured strokes (below).
#   write_lines2.py [RESID.json --keep name,...]
# (The traced residual lines of every late drawing were tried and dropped: on single grainy frames they changed the
# inner-owl σ0.7 error by −0.02…+0.09 and the high-pass energy by < 0.01 — noise, mostly outside the silhouettes.
# What is kept is measured by hand on many frames: the walk's strokes and the brandish's blade edges.)
import sys, json, os
r = json.load(open(sys.argv[1])) if len(sys.argv) > 1 and sys.argv[1].endswith('.json') else {}
keep = set(sys.argv[sys.argv.index('--keep') + 1].split(',')) if '--keep' in sys.argv else set()
# The walk's face-disc contour, chin mark and the wing's top edge: per-row / per-column ridge positions (median over
# the 56 walk frames, black top-hat of σ0.8 frames in the walk's own px; IQR 1–2 px) — the source draws them in every
# walk frame, the traced walk had none. [u, v, width, multiply]
WALK_ADD = [
    [[99.2, 28.0, 1.0, 0.93], [99.9, 31.0, 1.2, 0.9], [99.4, 33.5, 1.2, 0.88], [98.3, 35.5, 1.2, 0.86], [97.5, 37.0, 1.2, 0.86], [97.3, 39.0, 1.0, 0.92]],
    [[97.2, 46.8, 1.0, 0.94], [96.2, 48.6, 1.1, 0.92], [94.8, 50.6, 1.0, 0.94]],
    [[91.0, 64.2, 1.0, 0.95], [96.0, 64.1, 1.2, 0.93], [101.0, 63.9, 1.2, 0.93], [106.0, 63.9, 1.2, 0.94], [111.0, 63.9, 1.1, 0.94], [114.0, 63.8, 1.0, 0.96]],
]
# The brandish (80.08–80.52, one drawing): the blade's dark edge lines across the chest, sub-pixel ridge centres per
# column on the median of its four still frames 2010–2013 (black top-hat 7 px of σ0.6); the source's ridge is 9–31
# levels, ours was 1–24 there. (Its brow and eye already match once the line layers show: per-column darkest value
# below the white, x 351–356, 43–54 against 50–54.)
BRAND_ADD = [
    [[306, 89.1, 1.0, 0.95], [312, 91.2, 1.1, 0.9], [318, 94.5, 1.1, 0.9], [324, 97.2, 1.1, 0.9], [330, 99.8, 1.1, 0.9], [334, 101.4, 1.0, 0.95]],
    [[337, 103.6, 1.0, 0.97], [342, 106.6, 1.1, 0.93], [346, 107.4, 1.1, 0.88], [351, 107.9, 1.0, 0.92]],
    [[348, 98.8, 1.0, 0.92], [354, 99.0, 1.1, 0.88], [357, 99.5, 1.1, 0.88], [360, 101.0, 1.1, 0.88], [366, 102.2, 1.1, 0.9], [369, 102.1, 1.0, 0.94]],
    [[334, 87.8, 1.0, 0.92], [338, 89.3, 1.0, 0.92], [342, 91.0, 1.1, 0.9], [346, 91.9, 1.1, 0.9], [350, 92.0, 1.0, 0.93]],
]
out = {}
for k, v in r.items():
    if k not in keep: continue
    out[k] = [[round(x, 2) for p in L for x in p] for L in v if len(L) >= 2]
out['walk'] = out.get('walk', []) + [[x for p in L for x in p] for L in WALK_ADD]
out['brand'] = out.get('brand', []) + [[x for p in L for x in p] for L in BRAND_ADD]
hdr = """// s22 fix pass 2: residual fine lines of the late drawings, anchor-local px, per point [u, v, width, multiply]; drawn
// by s22/traced.js as a second multiplied layer after the drawing's softening. Measured on top of s22/lines.js with the
// film's own renderer (trace/write_lines2.py): the walk's face-disc contour, chin mark and wing edge (56 single
// frames) and the brandish's blade edge lines (its four still frames).
// Control points only; no pixels.
"""
js = hdr + 'export const LINES2 = {\n' + ',\n'.join(f'  {k}: {json.dumps(v, separators=(",", ":"))}' for k, v in out.items()) + '\n};\n'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lines2.js'), 'w').write(js)
print({k: len(v) for k, v in out.items()})
