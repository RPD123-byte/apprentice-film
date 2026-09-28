# per-frame camera nudge: with a set's geometry fixed, find the eye/yaw/pitch/roll that best fits the source edges
import json, subprocess, sys, numpy as np, cv2
from scipy.optimize import minimize
from proj import Scene, edges, W, H
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
S = 4
def srcedge(fi):
    g = cv2.imread(f'{SRC}/f{fi}.png', 0); g = cv2.resize(g, (W // S, H // S), interpolation=cv2.INTER_AREA)
    e = cv2.Canny(cv2.GaussianBlur(g, (0, 0), 1.0), 25, 70) > 0
    return e, cv2.distanceTransform((~e).astype(np.uint8), cv2.DIST_L2, 3)
def cost(sc, cam, es, ds, cap=12):
    ib, zb = sc.raster(cam[:3], cam[3], cam[4], cam[5], S=S)
    er = edges(ib)
    if er.sum() < 50: return 99
    dr = cv2.distanceTransform((~er).astype(np.uint8), cv2.DIST_L2, 3)
    return 0.5 * np.minimum(ds[er], cap).mean() + 0.5 * np.minimum(dr[es], cap).mean()
if __name__ == '__main__':
    key = sys.argv[1]; times = sys.argv[2]
    js = json.loads(subprocess.check_output(['node', 'faces.mjs', key, times]))
    sc = Scene(js['faces'])
    for tk, c in js['cams'].items():
        fi = int(round(c['t'] * 25)); es, ds = srcedge(fi)
        x0 = np.array(c['eye'] + [c['yaw'], c['pitch'], c['roll']])
        c0 = cost(sc, x0, es, ds)
        scale = np.array([0.05, 0.02, 0.1, 0.02, 0.02, 0.02])
        f = lambda p: cost(sc, x0 + p * scale, es, ds)
        r = minimize(f, np.zeros(6), method='Powell', options=dict(maxfev=300, xtol=0.05, ftol=0.01))
        d = r.x * scale
        print(f'{tk} cost {c0:5.2f} -> {r.fun:5.2f}  dx={d[0]:+.3f} dy={d[1]:+.3f} dz={d[2]:+.3f} dyaw={np.degrees(d[3]):+.2f} dpitch={np.degrees(d[4]):+.2f} droll={np.degrees(d[5]):+.2f}', flush=True)
