#!/usr/bin/env python3
# softmv.py T1,T2,.. -- the image motion of the soft (motion-blurred) room at each key time: DIS flow between the
# frames before and after, median over the key's soft region (ds > 0.5), in px per frame. Adds "mv" to tr/dT.json.
import cv2, numpy as np, json, sys
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i): cap.set(1, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
for ts in sys.argv[1].split(","):
    K = json.load(open(f"tr/d{ts}.json")); fi = int(round(float(ts) * 25))
    D = K["dirs"]; s = np.array(D["s"], float).reshape(D["ny"], D["nx"]) / 90; st = D["step"]
    a, b = fr(fi - 1), fr(fi + 1)
    fl = dis.calc(a, b, None) / 2
    m = cv2.resize((s > 0.5).astype(np.uint8), (D["nx"] * st, D["ny"] * st), interpolation=cv2.INTER_NEAREST)[:946, :2206] > 0
    m &= cv2.GaussianBlur(fr(fi).astype(np.float32), (0, 0), 4) > 12       # where there is something to smear
    if m.sum() < 500: K["mv"] = [0, 0]; print(ts, "no soft region"); json.dump(K, open(f"tr/d{ts}.json", "w")); continue
    vx, vy = float(np.median(fl[..., 0][m])), float(np.median(fl[..., 1][m]))
    K["mv"] = [round(vx, 1), round(vy, 1)]
    json.dump(K, open(f"tr/d{ts}.json", "w"))
    print(ts, "soft frac", round(float(m.mean()), 2), "mv", K["mv"])
