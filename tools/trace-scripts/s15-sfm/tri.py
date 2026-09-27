import numpy as np, pickle, json, cv2, sys
import ba
from common import W, H
def cams(out):
    R = ba.rot(out['rv']); return {f: (R[k], out['C'][k]) for k, f in enumerate(out['frames'])}, out['f']
def triangulate(obs, cm, f):
    # obs: {frame: (x,y)}; linear LS on rays
    A = []; b = []
    for fr, (x, y) in obs.items():
        if fr not in cm: continue
        R, C = cm[fr]
        d = R.T @ np.array([(x - W / 2) / f, (y - H / 2) / f, 1.0]); d /= np.linalg.norm(d)
        P = np.eye(3) - np.outer(d, d); A.append(P); b.append(P @ C)
    A = np.sum(A, 0); b = np.sum(b, 0)
    X = np.linalg.solve(A, b)
    # reprojection error
    err = []
    for fr, (x, y) in obs.items():
        if fr not in cm: continue
        R, C = cm[fr]; q = R @ (X - C); err.append(np.hypot(f * q[0] / q[2] + W / 2 - x, f * q[1] / q[2] + H / 2 - y))
    return X, np.array(err)
if __name__ == '__main__':
    out = pickle.load(open(sys.argv[1], 'rb')); cm, f = cams(out)
    tr = json.load(open(sys.argv[2]))
    frames = sorted(int(k) for k in tr)
    n = len(tr[str(frames[0])])
    for j in range(n):
        obs = {fr: tr[str(fr)][j] for fr in frames}
        X, e = triangulate(obs, cm, f)
        print(j, X.round(3), 'err', e.round(1))
