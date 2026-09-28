#!/usr/bin/env python3
# write src/shots/s26/fieldC2.js from field2.json + streaks.json (fieldnet.py)
import json, numpy as np
O = '/Users/computer/rootline/apprentice-film/snapshots/s26-fix1-meas/c'
d = json.load(open(f'{O}/field2.json')); st = json.load(open(f'{O}/streaks.json'))
c = np.array([994.4, 481.5])
keep = []
for x0, y0, x1, y1 in st:
    a, b = np.array([x0, y0]), np.array([x1, y1])
    if np.linalg.norm(a - c) > np.linalg.norm(b - c): a, b = b, a      # inner end first
    dv = (b - a) / np.linalg.norm(b - a); m = (a + b) / 2 - c; m /= np.linalg.norm(m)
    if abs(dv @ m) > 0.8: keep.append([round(float(v), 1) for v in (*a, *b)])
fmt = lambda v: str(int(v)) if float(v).is_integer() else str(v)
L = ["// s26 beat C: the shard field rebuilt as straight-edged shards, in field coordinates (= the 112.00 frame). Measured on",
"// the source (coordinates only; snapshots/s26-fix1-tools/fieldnet.py): the traced shard edges extended to meet each other",
"// + seeded straight chords through the large cells; the blast hole onto the colour page left open. Per shard, the piece",
"// of OUR page whose blurred tones best match the source shard on 112.00 (starting from its measured content; no designer",
"// faces, no colour pieces in grey shards).",
"// cells: [type, a, b, c, d, e, f, x0, y0, ...]: type 0 = B&W page (bwPlain frame px), 1 = colour page (colour px),",
"// 2 = black; field = [a b c; d e f] . page",
"export const FIELD_C2 = ["]
L += ["  [" + ",".join(fmt(v) for v in r) + "]," for r in d['cells']]
L += ["];", "// the blast's white streaks over the hole (measured edge segments lying in it, radial to (994, 481)): [x_in, y_in, x_out, y_out]",
      "export const STREAKS_C = [" + ",".join(fmt(v) for r in keep for v in r) + "];"]
open('/Users/computer/rootline/apprentice-film/src/shots/s26/fieldC2.js', 'w').write("\n".join(L) + "\n")
print(len(d['cells']), 'cells', len(keep), 'streaks')
