#!/usr/bin/env python3
# stretch.py log : mean blurred MAE per beat stretch from a pair.py log
import sys, re, numpy as np
v = {int(m.group(1)): float(m.group(2)) for m in re.finditer(r'k=(\d+) t=[\d.]+ MAE8=([\d.]+)', open(sys.argv[1]).read())}
S = [('84.04-84.08 hug', 2101, 2102), ('84.12-85.56 strip carried', 2103, 2139), ('85.60-86.00 dissolve, exit', 2140, 2150), ('86.04-86.52 empty slot', 2151, 2163),
     ('86.56-88.32 banner carried', 2164, 2208), ('88.36-89.56 slap, press', 2209, 2239), ('89.60-90.12 hop', 2240, 2253), ('90.16-92.56 wipe, crouch', 2254, 2314),
     ('92.60-93.80 power-up', 2315, 2345), ('93.84-94.84 scissors back', 2346, 2371), ('94.88-95.12 flare', 2372, 2378), ('95.16-95.92 two pairs', 2379, 2398), ('95.96-97.04 zip', 2399, 2426)]
for n, a, b in S:
    x = [v[k] for k in v if a <= k <= b]
    if x: print(f'| {n} | {np.mean(x):.1f} | {min(x):.1f}-{max(x):.1f} | {len(x)} |')
x = list(v.values()); print(f'mean {np.mean(x):.2f} range {min(x):.1f}-{max(x):.1f} over {len(x)}')
