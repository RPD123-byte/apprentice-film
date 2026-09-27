#!/usr/bin/env python3
# tone2js.py tone.json out.js — the fitted value-study corrections as a JS module
import json, sys
T = json.load(open(sys.argv[1]))
open(sys.argv[2], 'w').write("""// s13 value study, fitted (./trace/fit_tone.py): per part, a cubic polynomial in u = (x - 1300) / 300,
// v = (y - 470) / 300 (frame px) giving the pre-grade tone correction added to the part's base plumage before its
// ink strokes: [1, u, v, u^2, uv, v^2, u^3, u^2 v, u v^2, v^3]. Iterated render -> fit residual -> re-render.
export const TONE = %s;
""" % json.dumps(T, indent=0).replace('\n', ' '))
