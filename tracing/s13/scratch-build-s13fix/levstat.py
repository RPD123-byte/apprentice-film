# levstat.py render.png ref.png cel.json name -- per posterised band: source vs render medians inside the cel region
import cv2, numpy as np, json, sys
a = cv2.imread(sys.argv[1], 0).astype(float); b = cv2.imread(sys.argv[2], 0).astype(float)
d = json.load(open(sys.argv[3]))[sys.argv[4]]; g = cv2.GaussianBlur(b, (0, 0), 0.5); thr = [22, 50, 80, 115, 150, 185, 220]
H, W = b.shape; reg = np.zeros((H, W), np.uint8)
for r in d['region']:
    t = np.zeros((H, W), np.uint8); cv2.fillPoly(t, [np.array(r).reshape(-1, 2).astype(np.int32)], 1); reg ^= t
reg = cv2.erode(reg, np.ones((3, 3), np.uint8)); bb = [-1] + thr + [999]
A = cv2.GaussianBlur(a, (0, 0), 2); B = cv2.GaussianBlur(b, (0, 0), 2)
print('region MAE(sigma2) %.2f  mean diff %.2f' % (np.abs(A - B)[reg > 0].mean(), (A - B)[reg > 0].mean()))
for k in range(len(bb) - 1):
    m = cv2.erode(((reg > 0) & (g >= bb[k]) & (g < bb[k + 1])).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    print(k, bb[k], m.sum(), 'src', np.median(b[m]).round(1), 'render', np.median(a[m]).round(1))
