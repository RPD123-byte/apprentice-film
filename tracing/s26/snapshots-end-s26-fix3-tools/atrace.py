# atrace.py OUT.js [params-json]: end fix round 3 — re-trace beat A's standing owl (the box round it in the A key
# end-s26-fix1-meas/akey/kA.png, the pre-grade median of the 26 A frames at the settled camera, stage px) on a
# 2x-upsampled crop, and write it as a data module (s26/owlKeyA.js). Painted by s26.js over PAGEA[0] inside the box with a
# feathered edge. Measurement -> vectors only.
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, fl
from codec import deep
OUT = sys.argv[1]
import os
UP = 2
BOX = tuple(int(v) for v in os.environ.get('BOX', '866,226,1372,914').split(','))  # x0, y0, x1, y1 (stage px); the screen: 143,128,2020,914
P = dict(K=40, wink=True, inkbh=20, inkmax=215, inkq=8, eps=0.9, minarea=10, smooth=1.2, inkk=7, inkmin=16,
         inkarea=3.0, inkeps=0.6, inksmooth=0.9, winkk=7, winkarea=24, vote=3, hg=6, hc=7, chaikin=2,
         base=dict(K=12, minarea=60, eps=2, smooth=3, blur=6))
if len(sys.argv) > 2: P.update(json.loads(sys.argv[2]))
kA = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-meas/akey/kA.png')
x0, y0, x1, y1 = BOX
m = int(os.environ.get('MARGIN', 8))  # trace a margin round the box, so the feathered edge has trace under it
u = cv2.resize(kA[y0 - m:y1 + m, x0 - m:x1 + m], None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
z = np.ones(u.shape[:2], np.uint8)
regs, inks = trace(u, z, (0, 0), P)
def chaikin(p, n):
    for _ in range(n):
        q = np.roll(p, -1, 0); p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, 2)
    return p
off = np.array([x0 - m, y0 - m], float)
tf = lambda p, n: (chaikin(np.asarray(p, float), n) if n else np.asarray(p, float)) / UP + off
regs = [[a / UP / UP, c, tf(o, 0), [tf(h, 0) for h in hs]] for a, c, o, hs in regs]
inks = {c: [[tf(o, P['chaikin']), [tf(h, 0 if False else P['chaikin']) for h in hs]] for o, hs in ps] for c, ps in inks.items()}
R, I = pack(regs, inks)
zone = [fl(np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], float))]
row = json.dumps(deep([R, I, zone]), separators=(',', ':'))
open(OUT, 'w').write(
    "// s26 beat A (110.52-111.56): the standing owl, re-traced on a 2x-upsampled crop (end fix round 3; approved traced\n"
    "// geometry, STYLE.md 2026-09-27) from the same A key as PAGEA[0] (the pre-grade median of the 26 A frames at the settled\n"
    "// camera, stage px), inside the box OWLA_BOX. [regions, inks, zone] as in owlTraceCD.js (frame px x2, codec.js strings).\n"
    "// Written by snapshots/end-s26-fix3-tools/atrace.py; painted by s26.js over PAGEA[0] with a feathered edge.\n"
    f"export const OWLA_BOX = [{x0}, {y0}, {x1}, {y1}];\n"
    f"export const OWLA = {row};\n")
print(OUT, len(row), 'regions', len(R), 'inkgroups', len(I))
