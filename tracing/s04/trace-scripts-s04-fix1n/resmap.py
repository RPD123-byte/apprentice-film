# where does the hold key frame (20.56, warped by the measured flow) fail to show frame f?  -> residual maps
import cv2, numpy as np, sys
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i): cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
A = fr(514); H, W = A.shape; step = 24
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
tiles = []
for f in [int(v) for v in sys.argv[1].split(',')]:
    B = fr(f); fl = dis.calc(B, A, None); sm = cv2.GaussianBlur(fl, (0, 0), step / 2)
    Wp = cv2.remap(A, xx + sm[..., 0], yy + sm[..., 1], cv2.INTER_LINEAR)
    r = np.abs(cv2.GaussianBlur(Wp.astype(np.float32), (0, 0), 4) - cv2.GaussianBlur(B.astype(np.float32), (0, 0), 4))
    print(f, f"{f/25:.2f}", "mean", round(float(r.mean()), 2), "frac>12", round(float((r > 12).mean()), 3), "flow max", round(float(np.abs(sm).max()), 1))
    vis = np.dstack([B // 2, B // 2, np.clip(B // 2 + r * 8, 0, 255).astype(np.uint8)])
    cv2.putText(vis, f"{f/25:.2f}", (20, 60), 0, 2, (0, 255, 255), 3)
    tiles.append(cv2.resize(vis, (W // 4, H // 4)))
while len(tiles) % 4: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[2], np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]))
