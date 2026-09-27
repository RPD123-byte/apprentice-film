#!/usr/bin/env python3
# tojs.py strokes.json out.js : the traced room strokes as a JS module (per layer: flat [x, y, w, v, ...] per stroke)
import json, sys
R = json.load(open(sys.argv[1]))
lines = ["// s14 room ink strokes, traced from the 40.00 s source frame by trace/trace_room.py (control points only:",
         "// centre-line x, y, width, darkness ratio), per room layer, in R40 coordinates. Generated; do not edit.",
         "export const STROKES = {"]
for L, rows in R.items():
    flat = ["[" + ",".join(f"{v:g}" for p in r for v in p) + "]" for r in rows]
    lines.append(f"  {L}: [" + ",".join(flat) + "],")
lines.append("};")
open(sys.argv[2], "w").write("\n".join(lines) + "\n")
print(sys.argv[2], sum(len(r) for r in R.values()), "strokes")
