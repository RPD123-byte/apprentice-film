# hmae.py DIR t1,t2,... -- sigma-6 and sigma-2 MAE of harness renders dev/DIR/r-T.png against the source frames
import cv2, numpy as np, sys
d, ts = sys.argv[1], sys.argv[2].split(',')
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
out = []
for t in ts:
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(float(t) * 25))); ok, fr = cap.read()
    S = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    J = cv2.imread(f'{d}/r-{float(t):.2f}.png', 0).astype(np.float32)
    e6 = np.abs(cv2.GaussianBlur(J, (0, 0), 6) - cv2.GaussianBlur(S, (0, 0), 6)).mean()
    e2 = np.abs(cv2.GaussianBlur(J, (0, 0), 2) - cv2.GaussianBlur(S, (0, 0), 2)).mean()
    out.append((t, e6, e2))
print(' | '.join(f'{t}: {a:.2f}/{b:.2f}' for t, a, b in out), '| mean', round(float(np.mean([o[1] for o in out])), 2), round(float(np.mean([o[2] for o in out])), 2))
