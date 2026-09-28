# nstrips output -> JS entry {bands:[[cls, [[xa,ya,xb,yb],...], headTaper, tailTaper]]}; bands starting near the
# spine start are extended N steps by linear extrapolation (to run off the page edge).
import sys, json
R = json.load(open(sys.argv[1])); name = sys.argv[2]; ext = int(sys.argv[3]) if len(sys.argv) > 3 else 0
s0 = min(r[1][0][0] for r in R); s1 = max(r[1][-1][0] for r in R)
out = []
for cls, rows in R:
    pts = [r[1:] for r in rows]
    head = rows[0][0] > s0 + 30; tail = rows[-1][0] < s1 - 30
    if not head and ext:
        a, b = pts[0], pts[min(3, len(pts) - 1)]; k = min(3, len(pts) - 1)
        for e in range(1, ext + 1):
            pts.insert(0, [round(a[i] + (a[i] - b[i]) * e / k, 1) for i in range(4)])
    out.append([cls, pts, 1 if head else 0, 1 if tail else 0])
print(f"  {name}: {json.dumps(out, separators=(',', ':'))},")
