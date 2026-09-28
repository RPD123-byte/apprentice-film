# the flying owl's near headphone cup: affine ECC of a template cup (1153 or 1160) onto each frame, initialised from
# the eye similarity; the template's hand-measured outer ellipse mapped by it -> per-frame cup ellipse
import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
EY = {int(k): v for k, v in json.load(open('../s16-h1-work/eyes_fit.json')).items()}
TPL = {1153: dict(c=(648, 405), ax=(30, 45), ang=8), 1160: dict(c=(383, 713), ax=(32, 47), ang=5)}
def sim(a0, a1, b0, b1):
    """similarity mapping points a0->b0, a1->b1 (complex form)"""
    A0, A1, B0, B1 = complex(*a0), complex(*a1), complex(*b0), complex(*b1)
    k = (B1 - B0) / (A1 - A0); t = B0 - k * A0
    return np.array([[k.real, -k.imag, t.real], [k.imag, k.real, t.imag]], np.float32)
out = {}; tiles = []
for n in range(1148, 1162):
    T = 1153 if n <= 1156 else 1160
    tp = TPL[T]; R = h16.pre(T); Y = h16.pre(n)
    eT = EY[T]; eN = EY[n]
    w0 = sim(eT[0]['iris'][:2], eT[1]['iris'][:2], eN[0]['iris'][:2], eN[1]['iris'][:2])
    msk = np.zeros(R.shape, np.uint8); cv2.ellipse(msk, (tp['c'], (tp['ax'][0] * 2 + 16, tp['ax'][1] * 2 + 16), tp['ang']), 1, -1)
    try:
        cc, w = cv2.findTransformECC(cv2.GaussianBlur(R, (0, 0), 1.5), cv2.GaussianBlur(Y, (0, 0), 1.5), w0.copy(), cv2.MOTION_AFFINE,
                                     (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), msk, 5)
    except cv2.error:
        cc, w = -1, w0
    al = cv2.warpAffine(Y, w, (R.shape[1], R.shape[0]), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    e = np.abs(cv2.GaussianBlur(al, (0, 0), 1) - cv2.GaussianBlur(R, (0, 0), 1))[msk > 0].mean() * 255
    e0 = np.abs(cv2.GaussianBlur(cv2.warpAffine(Y, w0, (R.shape[1], R.shape[0]), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP), (0, 0), 1) - cv2.GaussianBlur(R, (0, 0), 1))[msk > 0].mean() * 255
    if e > e0: w = w0; e = e0; cc = -2
    out[n] = dict(T=T, A=w.tolist(), resid=float(e))
    print(n, 'T', T, 'cc %.3f resid %.2f (eyes-only %.2f)' % (cc, e, e0))
    # overlay: template ellipse mapped
    im = cv2.cvtColor((np.clip(Y, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    pts = []
    for k in range(64):
        th = 2 * np.pi * k / 64; a = np.radians(tp['ang'])
        x = tp['ax'][0] * np.cos(th); y = tp['ax'][1] * np.sin(th)
        p = np.array([tp['c'][0] + x * np.cos(a) - y * np.sin(a), tp['c'][1] + x * np.sin(a) + y * np.cos(a), 1])
        pts.append(w @ p)
    cv2.polylines(im, [np.round(np.array(pts)).astype(np.int32)], True, (0, 0, 255), 1)
    cx, cy = np.mean(pts, 0).astype(int)
    tiles.append(cv2.resize(im[cy - 70:cy + 70, cx - 60:cx + 60], (240, 280)))
while len(tiles) % 7: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(S + '/cupfit.jpg', np.vstack([np.hstack(tiles[i:i + 7]) for i in range(0, len(tiles), 7)]))
json.dump(out, open('../s16-h1-work/cup_fit.json', 'w'), indent=0)
