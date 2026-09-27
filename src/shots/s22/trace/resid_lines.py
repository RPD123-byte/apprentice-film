#!/usr/bin/env python3
# Fix pass 2: residual fine lines of the late drawings, measured on top of what the film now draws (lines.js visible,
# σ 0.45 softening, lines after it). Measuring only — writes control points, no pixels.
#   resid_lines.py RENDER_DIR SRC_DIR BOXES.json OUT.json [names...]
# RENDER_DIR / SRC_DIR hold r%04d.png (this film, rendered with the film's own browser) and f%04d.png (the source's
# frames). For every drawing, its frames are brought into anchor-local px at 4× (the walk through its per-pose fit),
# median'd, and trace_lines.py finds the thin dark ridges of (render − source) inside the owl ('hp': the local
# residual, since the margin's white cap keeps the render's whites below the source's).
import sys, os, json, subprocess, cv2, numpy as np
R, SD, BX, OUT = sys.argv[1:5]
names = sys.argv[5:]
B = json.load(open(BX))
D = os.path.dirname(os.path.abspath(__file__))
work = os.path.join(os.path.dirname(os.path.abspath(OUT)), 'resid_work'); os.makedirs(work, exist_ok=True)
gray = lambda I: cv2.cvtColor(I, cv2.COLOR_BGR2GRAY).astype(np.float32)
S = 4
def aligned(I, m, u0, v0, uw, vh):
    a, b, c, d, e, f = m
    M = np.array([[a / S, c / S, a * u0 + c * v0 + e], [b / S, d / S, b * u0 + d * v0 + f]], np.float64)
    return cv2.warpAffine(I, M, (uw * S, vh * S), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP)
groups = {}
for F, v in B.items():
    if v['name'].startswith('edge'): continue
    groups.setdefault(v['name'], []).append(int(F))
res = {}
for name, Fs in sorted(groups.items()):
    if names and name not in names: continue
    v = B[str(Fs[0])]; o = v['o']
    u0, v0, uw, vh = o[0] - 8, o[1] - 8, v['w'] + 16, v['h'] + 16
    if name != 'walk': u0, v0 = int(np.floor(u0)), int(np.floor(v0))
    sa, ra = [], []
    for F in sorted(Fs):
        rp, sp = f'{R}/r{F:04d}.png', f'{SD}/f{F:04d}.png'
        if not (os.path.exists(rp) and os.path.exists(sp)): continue
        m = B[str(F)]['m']
        ra.append(aligned(gray(cv2.imread(rp)), m, u0, v0, uw, vh)); sa.append(aligned(gray(cv2.imread(sp)), m, u0, v0, uw, vh))
    if not sa: continue
    sm, rm = np.median(sa, 0), np.median(ra, 0)
    cv2.imwrite(f'{work}/{name}_s.png', np.clip(sm, 0, 255).astype(np.uint8)); cv2.imwrite(f'{work}/{name}_r.png', np.clip(rm, 0, 255).astype(np.uint8))
    # thresholds: the walk's median is of 56 frames (grain-free), the others of 1–12 (grainy): higher thresholds
    hi, lo = (6, 3) if len(sa) > 8 else (9, 4.5)
    out = f'{work}/{name}.json'
    r = subprocess.run([sys.executable, f'{D}/trace_lines.py', f'{work}/{name}_s.png', f'{work}/{name}_r.png', out, f'{work}/{name}_dbg.jpg',
                        str(u0), str(v0), str(S), str(hi), str(lo), '12', 'hp'], capture_output=True, text=True)
    print(name, len(sa), 'frames:', r.stdout.strip(), r.stderr.strip()[-300:])
    res[name] = json.load(open(out))
json.dump(res, open(OUT, 'w'))
