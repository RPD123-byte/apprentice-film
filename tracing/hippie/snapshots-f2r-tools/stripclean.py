# Clean strips (robust median + snap adjacent bands) and emit a JS literal.
# Usage: stripclean.py in.json NAME dir(row|col) order(e.g. CYOPV) [extend_start extend_end] > frag.js
import sys, json, numpy as np
S0 = json.load(open(sys.argv[1])); name = sys.argv[2]; d = sys.argv[3]; order = sys.argv[4]
MERGE = '--merge' in sys.argv
CUT = None
if '--cut' in sys.argv: CUT = [int(v) for v in sys.argv[sys.argv.index('--cut') + 1].split(',')]
sys.argv = [v for v in sys.argv if v not in ('--merge',)]
S = []
for cls, pts in S0:
    if CUT: pts = [p for p in pts if CUT[0] <= p[0] <= CUT[1]]
    if MERGE and S and any(c == cls for c, _ in S):
        for e in S:
            if e[0] == cls: e[1] = sorted(e[1] + pts)
    else: S.append([cls, pts])
pos = [v for v in sys.argv[5:] if not v.startswith('--') and ',' not in v]
ext0 = int(pos[0]) if len(pos) > 0 else 0; ext1 = int(pos[1]) if len(pos) > 1 else 0
def robust(v):
    v = np.array(v, float); n = len(v); out = v.copy()
    for i in range(n):
        w = v[max(0, i - 2):i + 3]; m = np.median(w)
        if abs(v[i] - m) > 5: out[i] = m
    sm = out.copy()
    for i in range(1, n - 1): sm[i] = 0.25 * out[i - 1] + 0.5 * out[i] + 0.25 * out[i + 1]
    return sm
bands = []
for cls, pts in S:
    if len(pts) < 2: continue
    s = [p[0] for p in pts]; a = robust([p[1] for p in pts]); b = robust([p[2] for p in pts])
    bands.append([cls, {int(si): [ai, bi] for si, ai, bi in zip(s, a, b)}])
# snap neighbours in the given order (left/top -> right/bottom)
bands.sort(key=lambda B: order.index(B[0]) if B[0] in order else 99)
for i in range(len(bands) - 1):
    A, Bn = bands[i][1], bands[i + 1][1]
    for s in set(A) & set(Bn):
        if abs(A[s][1] - Bn[s][0]) < 9: m = (A[s][1] + Bn[s][0]) / 2; A[s][1] = m; Bn[s][0] = m
out = []
for cls, D in bands:
    ks = sorted(D); step = ks[1] - ks[0] if len(ks) > 1 else 10
    rows = [[k, round(D[k][0], 1), round(D[k][1], 1)] for k in ks]
    if ext0 and ks[0] == min(min(dd) for _, dd in bands):
        r0, r1 = rows[0], rows[1]; rows.insert(0, [r0[0] - ext0, round(2 * r0[1] - r1[1], 1), round(2 * r0[2] - r1[2], 1)])
    if ext1 and ks[-1] == max(max(dd) for _, dd in bands):
        r0, r1 = rows[-1], rows[-2]; rows.append([r0[0] + ext1, round(2 * r0[1] - r1[1], 1), round(2 * r0[2] - r1[2], 1)])
    out.append([cls, rows])
print(f"  {name}: {{ dir: \"{d}\", bands: {json.dumps(out, separators=(',', ':'))} }},")
