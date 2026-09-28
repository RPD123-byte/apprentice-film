# The melting dust haze (65.76–67.16), measured per frame as a sum of soft round blobs (MEASUREMENT script, not
# loaded by the film): the lift field = source (un-graded, in the A frame) minus the clean room, smoothed, owl masked
# out; greedy matching pursuit picks the Gaussian blob (x, y, sigma, amplitude) that explains most of what is left,
# subtracts it, repeats. Output: src/shots/s20/data/haze.js  HAZE = { "t": [[x, y, sigma, amp], ...] } (A frame px,
# pre-grade additive light).
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import composite2 as C
M = C.M; OUT = C.OUT
Af = np.load(OUT + '/Afull.npy')
REG = C.poly_mask([[(560, 250), (1180, 250), (1180, 920), (560, 920)]])
SIGMAS = [10, 16, 24, 40, 64]
sel = {}
for line in open(os.path.join(os.path.dirname(__file__), '..', 'data', 'owlframes.js')):
    line = line.strip()
    if line.startswith('"'):
        t = line.split('"')[1]; sel[t] = json.loads('[' + line.split('[', 1)[1].rstrip(',').rstrip(']') + ']')
def owl_mask(n):
    w = sel.get('%.2f' % (n / 25))
    if not w: return None
    k = w[0]; m0 = np.load(OUT + '/key_%s_mask.npy' % k).astype(np.uint8)
    a, b, c, d, e, f = w[1:7]
    if len(w) > 8 and w[8] == 'screen':
        cam = C.camA(n)
        if cam is not None:
            A = np.array([[cam[0], cam[2], cam[4]], [cam[1], cam[3], cam[5]], [0, 0, 1]]); Ai = np.linalg.inv(A)
            a, c, e = Ai[0]; b, d, f = Ai[1]
    Mm = np.array([[a, c, e + M - a * M - c * M], [b, d, f + M - b * M - d * M]], np.float32)
    return cv2.dilate(cv2.warpAffine(m0, Mm, (C.WW, C.HH), flags=cv2.INTER_NEAREST), np.ones((9, 9), np.uint8)) > 0
out = {}
for n in range(1644, 1680):
    t = n / 25
    f, val = C.to_margin(C.pre(n), C.affine_to(C.camA(n)))
    # signed: where the haze veils a white line it lowers it — the net lift is what the blobs must carry
    d = cv2.GaussianBlur(f, (0, 0), 3) - cv2.GaussianBlur(Af, (0, 0), 3)
    valid = REG & val
    om = owl_mask(n)
    if om is not None: valid &= ~om
    # work at 1/4 resolution
    s4 = 4
    D = cv2.resize(np.where(valid, d, 0), None, fx=1 / s4, fy=1 / s4, interpolation=cv2.INTER_AREA)
    V = cv2.resize(valid.astype(np.float32), None, fx=1 / s4, fy=1 / s4, interpolation=cv2.INTER_AREA) > 0.5
    R = np.where(V, D, 0).astype(np.float32)
    blobs = []
    for it in range(48):
        best = None
        for sg in SIGMAS:
            s = sg / s4
            # matched filter response of a unit Gaussian on the valid pixels -> least-squares amplitude
            num = cv2.GaussianBlur(R, (0, 0), s) ; den = cv2.GaussianBlur(V.astype(np.float32), (0, 0), s / np.sqrt(2)) + 1e-6
            # amplitude a* = <R,g>/<g,g>; energy gain ~ a*·<R,g>
            amp = np.clip(2 * num / den, 0, R.max())
            gain = np.where(den > 0.35, amp * num * s * s, 0)
            y, x = np.unravel_index(np.argmax(gain), gain.shape)
            if best is None or gain[y, x] > best[0]: best = (gain[y, x], x, y, s, amp[y, x])
        g, x, y, s, a = best
        if a < 0.005: break
        yy, xx = np.mgrid[0:R.shape[0], 0:R.shape[1]]
        G = a * np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * s * s))
        R = np.where(V, R - G, 0)
        blobs.append([int(x * s4 + s4 / 2 - M), int(y * s4 + s4 / 2 - M), round(float(s * s4), 1), round(float(a), 3)])
    resid = np.abs(R[V]).mean() if V.any() else 0
    out['%.2f' % t] = blobs
    print('%.2f blobs %d  mean lift %.4f  residual %.4f' % (t, len(blobs), D[V].mean(), resid))
lines = ["// Melting dust haze per source frame (s20/trace/haze.py): Gaussian blobs [x, y, sigma, amplitude] (setup-A frame px,",
         "// pre-grade additive light) fitted by matching pursuit to the measured lift field (source minus the clean room).",
         "export const HAZE = {"]
for t, b in out.items(): lines.append('  "%s": %s,' % (t, json.dumps(b, separators=(',', ':'))))
lines.append("};")
open(os.path.join(os.path.dirname(__file__), '..', 'data', 'haze.js'), 'w').write('\n'.join(lines) + '\n')
