# caltone.py RENDERDIR FRAME PART[,PART...] [--k 6] : per-anchor density multipliers (src/shots/s13/flowCal.js) nudged so
# the sigma-8 tone of the render meets the source's near each anchor (pre-grade): where the render is lighter by d, the
# anchor's stroke density is scaled by exp(k * d) (clamped 0.67..1.5 per step, 0.2..5 overall). Only anchors inside the
# part's visible area (top layer, eroded 10 px) are touched.
import sys, json, numpy as np, cv2
from cfg import *
d, f = sys.argv[1], int(sys.argv[2]); parts = sys.argv[3].split(',')
k = float(sys.argv[sys.argv.index('--k') + 1]) if '--k' in sys.argv else 6
try: CAL = jsdata('flowCal')
except Exception: CAL = {}
FL = jsdata('flowM')
R = cv2.GaussianBlur(ungrade(cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32), f / 25 + 0.02), (0, 0), 8)
fr = '891-898' if 891 <= f <= 898 else '901-902' if f in (901, 902) else str(f)
S = cv2.GaussianBlur(srcpre(fr), (0, 0), 8)
C = jsdata('silC'); X = jsdata('silX', 'SILFEET')
order = [('nub', ringmask(C['nub'])), ('tail', ringmask(jsdata('silX', 'SILTAIL'))), ('body', ringmask(C['body'])), ('wing', ringmask(C['wing'])), ('feet', ringmask(X)), ('head', ringmask(C['head']))]
if 901 <= f <= 911: order[-1] = ('headF', ringmask(jsdata('silD')['headF']))
if f == 912: order[-1] = ('headE', ringmask(jsdata('silX', 'SILE')))
top = {}; cover = np.zeros((946, 2206), np.uint8)
for kk, m in reversed(order): top[kk] = cv2.erode(m & (1 - cover), np.ones((21, 21), np.uint8)); cover |= m
for part in parts:
    A = FL[part]; cal = CAL.get(part, [1.0] * len(A))
    if len(cal) != len(A): cal = [1.0] * len(A)
    tp = top[part].copy(); apply_exb(tp, part)
    ds = []
    for i, a in enumerate(A):
        x, y = a[0], a[1]
        if not tp[y, x] or a[9] <= 0: continue
        dlt = float(R[y, x] - S[y, x]); ds.append(dlt)
        cal[i] = float(np.clip(cal[i] * np.clip(np.exp(k * dlt), 0.67, 1.5), 0.2, 5))
    CAL[part] = [round(v, 3) for v in cal]
    print(f'{part}: anchors touched {len(ds)}, mean render-source {np.mean(ds):+.4f}, mean |d| {np.mean(np.abs(ds)):.4f}')
s = ("// s13 per-anchor density multipliers for the hatching rules (fix pass 1b), CALIBRATED by\n"
     "// snapshots/s13-fix1-tools/caltone.py: the render's sigma-8 tone near each anchor of ./flowM.js nudged to the source's\n"
     "// (aligned with FLOW[part]).\n"
     "export const FCAL = {\n" + ''.join(f"  {kk}: {json.dumps(v, separators=(',', ':'))},\n" for kk, v in CAL.items()) + "};\n")
open(ROOT + '/src/shots/s13/flowCal.js', 'w').write(s)
