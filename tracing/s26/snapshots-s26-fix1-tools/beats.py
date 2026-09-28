#!/usr/bin/env python3
# per-beat mean of a cmp.py log. Usage: beats.py LOG
import sys, re, collections
B = [("A", 2763, 2788), ("B", 2789, 2789), ("C", 2790, 2817), ("D", 2818, 2842), ("E", 2843, 2853), ("F1", 2854, 2887), ("F2", 2888, 2938)]
v = {}
for l in open(sys.argv[1]):
    m = re.match(r"F(\d+) .*=([\d.]+)", l)
    if m: v[int(m.group(1))] = float(m.group(2))
allv = []
for n, a, b in B:
    xs = [v[f] for f in v if a <= f <= b]
    allv += xs
    if xs: print(f"{n:3s} {len(xs):3d}  mean {sum(xs)/len(xs):6.2f}  min {min(xs):6.2f}  max {max(xs):6.2f}")
print(f"all {len(allv):3d}  mean {sum(allv)/len(allv):6.2f}")
