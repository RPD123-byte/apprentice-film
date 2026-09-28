#!/usr/bin/env python3
# layerio.py get|put WORK KEY : copy hands.json[KEY] to/from WORK/hands_KEY.json (for correct.py / texture.py)
import json, sys
op, W, K = sys.argv[1:4]
H = json.load(open(W + "/hands.json"))
if op == "get": json.dump(H[K], open(W + "/hands_%s.json" % K, "w"))
else: H[K] = json.load(open(W + "/hands_%s.json" % K)); json.dump(H, open(W + "/hands.json", "w"))
