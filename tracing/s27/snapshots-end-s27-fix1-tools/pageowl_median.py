# Registered median of the page owl in PAGE coordinates over the frontal hold (118.2-119.6): each source frame un-graded
# (s27t-tools/ungrade.py) and warped into page px by the shot's own screen track (SCREEN, page -> frame). Measurement only.
import cv2, numpy as np, json, subprocess, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from ungrade import ungrade
W = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-work'
TOOLS = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-tools'
frames = list(range(2955, 2991))            # 118.20 .. 119.60
js = """import { SCREEN } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data.js";
function seg(T, t) { let i = 1; while (i < T.length - 1 && T[i][0] < t) i++; return i; }
function crRows(T, t) { const n = T.length; if (t <= T[0][0]) return T[0].slice(1); if (t >= T[n - 1][0]) return T[n - 1].slice(1);
  const i = seg(T, t), p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((_, k0) => { const k = k0 + 1; return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3); }); }
const o = {}; for (const F of process.argv[2].split(",").map(Number)) o[F] = crRows(SCREEN, F / 25); console.log(JSON.stringify(o));"""
open(f'{TOOLS}/screenH.mjs', 'w').write(js)
H = json.loads(subprocess.check_output(['node', f'{TOOLS}/screenH.mjs', ','.join(map(str, frames))]))
PX0, PY0, PX1, PY1 = 1860, 0, 2180, 300          # page region (page px)
stack = []
for F in frames:
    f = cv2.imread(f'{W}/src/s{F}.png')
    u = np.clip(ungrade(f, F / 25) * 255, 0, 255).astype(np.float32)
    Hm = np.array(H[str(F)], np.float64).reshape(3, 3)
    T = np.array([[1, 0, PX0], [0, 1, PY0], [0, 0, 1]], np.float64)      # dst px -> page px
    M = Hm @ T                                                          # dst px -> frame px
    w = cv2.warpPerspective(u, M, (PX1 - PX0, PY1 - PY0), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP)
    stack.append(w)
med = np.median(np.stack(stack), 0)
cv2.imwrite(f'{W}/pageowl_med.png', np.clip(med + 0.5, 0, 255).astype(np.uint8))
# graded version too (for viewing)
print('ok', med.shape)
