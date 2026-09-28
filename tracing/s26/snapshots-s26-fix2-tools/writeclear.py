#!/usr/bin/env python3
# write src/shots/s26/ringClear.js from s26-fix2-meas/ringfit.json (ringfit.py)
import json
d = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s26-fix2-meas/ringfit.json'))
items = sorted((int(k), v) for k, v in d.items())
L = ["// s26 beat D (fix #2): ring shards that stop covering the arriving colour page, per shard index of RING_D2 -> the",
"// source frame from which the source shows the page there (snapshots/s26-fix2-tools/ringfit.py: the switch frame that",
"// minimises the sigma-4 error of our shard before it plus our page after it, against the source, inside the shard moved",
"// by the ring's measured motion; frame numbers only). 2818 = clear glass from the start (outline and a faint tint",
"// stay); later = the shard is flung out and gone by then.",
"export const RING_CLEAR = {" + ", ".join(f"{k}: {v}" for k, v in items) + "};"]
open('/Users/computer/rootline/apprentice-film/src/shots/s26/ringClear.js', 'w').write("\n".join(L) + "\n")
print(len(items))
