#!/usr/bin/env python3
# compare two cmp.py logs frame by frame. Usage: dcmp.py A.cmp B.cmp
import sys, re
def rd(p): return {int(m.group(1)): float(m.group(2)) for m in (re.match(r"F(\d+) .*=([\d.]+)", l) for l in open(p)) if m}
a, b = rd(sys.argv[1]), rd(sys.argv[2]); ks = sorted(set(a) & set(b))
for k in ks: print(f"F{k} {a[k]:6.2f} -> {b[k]:6.2f}  {b[k]-a[k]:+.2f}")
print(f"mean {sum(a[k] for k in ks)/len(ks):.3f} -> {sum(b[k] for k in ks)/len(ks):.3f}  n {len(ks)}")
