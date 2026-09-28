#!/usr/bin/env python3
# track_key.py T masks.json key.json [lo hi] -- landmarks for warping a traced key to the frames it covers:
# corners inside the hull on the key frame, tracked frame to frame with pyramidal Lucas-Kanade (forward/backward
# checked) to the frames T+lo/25 .. T+hi/25. Adds "tracks": {"src": [...], "f": {off: [x,y,...] (null = lost)}}.
import cv2, numpy as np, json, sys
T = float(sys.argv[1]); MJ = json.load(open(sys.argv[2])); KP = sys.argv[3]
lo = int(sys.argv[4]) if len(sys.argv) > 4 else -2; hi = int(sys.argv[5]) if len(sys.argv) > 5 else 2
key = MJ[f"{T:.2f}"]
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap = cv2.VideoCapture(V)
f0 = int(round(T * 25))
frames = {}
for i in range(f0 + lo, f0 + hi + 1):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, fr = cap.read(); frames[i - f0] = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
Hh, Ww = frames[0].shape
hull = key["hull"]; hull = [hull] if isinstance(hull[0][0], (int, float)) else hull
m = np.zeros((Hh, Ww), np.uint8)
for p in hull: cv2.fillPoly(m, [np.array(p, np.int32)], 255)
for p in key.get("cut", []): cv2.fillPoly(m, [np.array(p, np.int32)], 0)
m = cv2.erode(m, np.ones((15, 15), np.uint8))
pts = cv2.goodFeaturesToTrack(frames[0], maxCorners=int(key.get("ncorners", 260)), qualityLevel=0.01, minDistance=int(key.get("mindist", 32)), mask=m, blockSize=9)
pts = pts[:, 0, :].astype(np.float32)
# add a sparse grid over the hull so flat areas are anchored too (tracked the same way)
gy, gx = np.mgrid[40:Hh:90, 40:Ww:90]
g = np.stack([gx.ravel(), gy.ravel()], 1).astype(np.float32)
g = g[m[g[:, 1].astype(int), g[:, 0].astype(int)] > 0]
pts = np.vstack([pts, g])
lk = dict(winSize=(31, 31), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, 0.01))
res = {0: pts.copy()}
valid = {0: np.ones(len(pts), bool)}
for direction in (1, -1):
    cur = pts.copy(); ok_all = np.ones(len(pts), bool); k = 0
    while (direction > 0 and k < hi) or (direction < 0 and k > lo):
        a, b = frames[k], frames[k + direction]
        nxt, st, _ = cv2.calcOpticalFlowPyrLK(a, b, cur, None, **lk)
        back, st2, _ = cv2.calcOpticalFlowPyrLK(b, a, nxt, None, **lk)
        fb = np.linalg.norm(back - cur, axis=1)
        ok = (st[:, 0] == 1) & (st2[:, 0] == 1) & (fb < 1.0)
        ok_all &= ok
        cur = nxt; k += direction
        res[k] = cur.copy(); valid[k] = ok_all.copy()
K = json.load(open(KP))
K["tracks"] = {"src": [round(float(v), 1) for v in pts.ravel()],
               "f": {str(o): [(round(float(p[0]), 1) if valid[o][i] else None) for i, p in enumerate(res[o]) for _ in (0,)] for o in res}}
# store x,y pairs (None pairs for lost points)
K["tracks"]["f"] = {str(o): sum(([round(float(p[0]), 1), round(float(p[1]), 1)] if valid[o][i] else [None, None] for i, p in enumerate(res[o])), []) for o in res}
json.dump(K, open(KP, "w"))
print(f"{T:.2f}: {len(pts)} landmarks; valid per offset", {o: int(valid[o].sum()) for o in sorted(res)})
