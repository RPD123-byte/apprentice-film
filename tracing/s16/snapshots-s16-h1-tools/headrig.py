# ECC affine of the owl's head (template frame T, box) onto every flight frame; prints residuals
import sys, cv2, numpy as np; sys.path.insert(0, '.')
import h16
T = int(sys.argv[1]) if len(sys.argv) > 1 else 1153
R = h16.pre(T)
# head box in T (eyes, beak, band, cup)
hb = (615, 240, 870, 420) if T == 1153 else tuple(int(v) for v in sys.argv[2].split(','))
x0, y0, x1, y1 = hb
tmpl = R[y0:y1, x0:x1]
prev = None
out = {}
for n in [int(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 else list(range(1148, 1162)):
    Y = h16.pre(n)
    # initial guess: translation from template matching
    res = cv2.matchTemplate(cv2.GaussianBlur(Y, (0, 0), 2), cv2.GaussianBlur(tmpl, (0, 0), 2), cv2.TM_CCOEFF_NORMED)
    _, mx, _, loc = cv2.minMaxLoc(res)
    w = np.array([[1, 0, loc[0] - x0], [0, 1, loc[1] - y0]], np.float32)
    msk = np.zeros(R.shape, np.uint8); msk[y0:y1, x0:x1] = 1
    try:
        cc, w = cv2.findTransformECC(cv2.GaussianBlur(R, (0, 0), 1.2), cv2.GaussianBlur(Y, (0, 0), 1.2), w, cv2.MOTION_AFFINE,
                                     (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), msk, 5)
    except cv2.error as e:
        cc = -1
    # w maps template coords (R) -> frame coords? findTransformECC(template, input): warp maps template pts to input
    al = cv2.warpAffine(Y, w, (R.shape[1], R.shape[0]), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    e = np.abs(cv2.GaussianBlur(al, (0, 0), 1.0) - cv2.GaussianBlur(R, (0, 0), 1.0))[y0:y1, x0:x1].mean() * 255
    sc = np.sqrt(abs(np.linalg.det(w[:, :2]))); rot = np.degrees(np.arctan2(w[1, 0], w[0, 0]))
    print(n, 'tm %.3f cc %.4f resid %.2f  scale %.3f rot %.2f  t (%.1f, %.1f)' % (mx, cc, e, sc, rot, w[0, 2], w[1, 2]))
    out[n] = w.tolist()
import json; json.dump(out, open(f'../s16-h1-work/headrig_{T}.json', 'w'))
