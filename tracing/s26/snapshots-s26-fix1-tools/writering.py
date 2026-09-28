#!/usr/bin/env python3
# write src/shots/s26/ringD2.js from ring2.json (ringnet.py)
import json
d = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s26-fix1-meas/c/ring2.json'))
fmt = lambda v: str(int(v)) if float(v).is_integer() else str(v)
L = ["// s26 beat D: the ring of B&W shards round the colour window at 112.72, rebuilt as straight-edged shards (ring",
"// coordinates = the 112.72 frame). Measured on the source (coordinates only; snapshots/s26-fix1-tools/ringnet.py): the",
"// colour window = where the source shows our colour page under pageArrival(112.72) (+ the owl), as a straight-edged",
"// polygon; the ring's traced edges extended to meet each other + the window outline + seeded chords through big cells.",
"// Per shard, the piece of OUR B&W page (enlarged, as the ring's shards are) or black whose blurred tones best match",
"// the source shard (starting from the traced cell's measured page transform; no designer face).",
"// cells: [type, a, b, c, d, e, f, x0, y0, ...]: 0 = B&W page (bwPlain frame px), 1 = colour page (colour px),",
"// ring = [a b c; d e f] . page; 2 = black; 3 = clear glass (the arriving colour page shows through; outline only)",
"export const RING_D2 = ["]
L += ["  [" + ",".join(fmt(v) for v in r) + "]," for r in d['cells']]
L += ["];", "export const WINDOW_D2 = [" + ",".join(fmt(v) for v in d['window']) + "];"]
open('/Users/computer/rootline/apprentice-film/src/shots/s26/ringD2.js', 'w').write("\n".join(L) + "\n")
print(len(d['cells']))
