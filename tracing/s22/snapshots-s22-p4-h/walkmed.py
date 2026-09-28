# walkmed.py DIR|src out: median of the walk drawing in its own anchor-local coords (WALK_T per pose); measuring only
import sys, cv2, numpy as np, subprocess, json, os
sys.path.insert(0, '.')
from run import src
W = json.loads(subprocess.run(['node', '-e', "import('../../src/shots/s22/owlData.js').then(m=>console.log(JSON.stringify(m.TRACED.walk.meta.warp)))"], capture_output=True, text=True).stdout)
keys = sorted((float(t), v) for t, v in W.items())
def hold(t):
    r = keys[0][1]
    for k, v in keys:
        if k <= t + 0.005: r = v
    return r
U0, V0, U1, V1, S = -50, -40, 260, 170, 4
d, out = sys.argv[1], sys.argv[2]
st = []
for F in range(2043, 2099):
    t = F / 25
    if t < 81.72 or t >= 83.96: continue
    a, b, c, dd, e, f = hold(t)
    M = np.array([[a, c], [b, dd]], np.float32)   # canvas transform(a,b,c,d,e,f): x' = a x + c y + e
    Mx = np.zeros((2, 3), np.float32); Mx[:, :2] = M / S; Mx[:, 2] = np.array([e, f]) + M @ np.array([U0 + 0.5 / S - 0.5, V0 + 0.5 / S - 0.5])
    im = src(F) if d == 'src' else cv2.imread(f'{d}/r{F:04d}.png')
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    st.append(cv2.warpAffine(g, Mx, ((U1 - U0) * S, (V1 - V0) * S), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE))
med = np.median(np.stack(st), 0)
cv2.imwrite(out, np.clip(med, 0, 255).astype(np.uint8)); print(len(st), med.shape)
