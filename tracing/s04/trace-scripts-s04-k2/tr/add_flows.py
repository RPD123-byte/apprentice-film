#!/usr/bin/env python3
# add_flows.py key.json offsets(comma) [step] -- like flow_key.py, but MERGES the requested offsets into the key's
# existing flows / held lists (offsets already measured are kept, not re-measured).
import cv2, numpy as np, json, sys
KP = sys.argv[1]; offs = [int(v) for v in sys.argv[2].split(",") if v]; step = int(sys.argv[3]) if len(sys.argv) > 3 else 24
K = json.load(open(KP)); T = K["t"]
F = K.get("flows") or {}; held = list(K.get("held") or [])
offs = [o for o in offs if o != 0 and str(o) not in F and str(o) not in held]
if not offs: print(f"{T:.2f}: nothing to add"); sys.exit(0)
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i): cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
f0 = int(round(T * 25)); A = fr(f0); H, W = A.shape
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
nx, ny = W // step + 2, H // step + 2
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
hull = K["hull"]; hull = [hull] if isinstance(hull[0][0], (int, float)) else hull
m = np.zeros((H, W), np.uint8)
for p in hull: cv2.fillPoly(m, [np.array(p, np.int32)], 1)
bl = lambda x: cv2.GaussianBlur(x.astype(np.float32), (0, 0), 3)
for o in offs:
    B = fr(f0 + o)
    fl = dis.calc(B, A, None)
    sm = cv2.GaussianBlur(fl, (0, 0), step / 2)
    xs = np.minimum(np.arange(nx) * step, W - 1); ys = np.minimum(np.arange(ny) * step, H - 1)
    g = sm[ys][:, xs]
    q = np.round(g * 4).astype(int)
    un = np.abs(bl(A) - bl(B))[m > 0].mean()
    if un < 1.6:
        print(f"{T:.2f} offset {o:+d}: held (unwarped {un:.1f})"); held.append(str(o)); continue
    F[str(o)] = {"nx": nx, "ny": ny, "step": step, "v": q.reshape(-1).tolist()}
    fx = cv2.remap(g[..., 0].astype(np.float32), xx / step, yy / step, cv2.INTER_LINEAR); fy = cv2.remap(g[..., 1].astype(np.float32), xx / step, yy / step, cv2.INTER_LINEAR)
    Wp = cv2.remap(A, xx + fx, yy + fy, cv2.INTER_LINEAR)
    print(f"{T:.2f} offset {o:+d}: MAE(s3) unwarped {un:.1f} warped {np.abs(bl(Wp) - bl(B))[m > 0].mean():.1f}  max|flow| {np.abs(g).max():.0f}px")
K["flows"] = F; K["held"] = held
json.dump(K, open(KP, "w"))
