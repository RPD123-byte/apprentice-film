# pair.py DIR out.jpg T1,T2,.. [x0 y0 x1 y1] [--w PX] -- render | source rows (crop), labelled
import cv2, numpy as np, sys
d, out, ts = sys.argv[1], sys.argv[2], [float(v) for v in sys.argv[3].split(',')]
args = sys.argv[4:]; wpx = 1100
if '--w' in args: i = args.index('--w'); wpx = int(args[i + 1]); args = args[:i] + args[i + 2:]
box = [int(v) for v in args] if len(args) == 4 else [0, 0, 2206, 946]
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
rows = []
for t in ts:
    R = cv2.imread(f'{d}/r-{t:.2f}.png'); cap.set(1, int(round(t * 25))); ok, S = cap.read()
    x0, y0, x1, y1 = box; a = R[y0:y1, x0:x1]; b = S[y0:y1, x0:x1]
    s = wpx / (2 * (x1 - x0)); a = cv2.resize(a, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC); b = cv2.resize(b, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    row = np.hstack([a, np.full((a.shape[0], 4, 3), (0, 0, 255), np.uint8), b])
    cv2.putText(row, f"{t:.2f}", (8, 28), 0, 0.9, (0, 255, 255), 2); rows.append(row)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
