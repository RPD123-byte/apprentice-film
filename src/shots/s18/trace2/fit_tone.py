# fit_tone.py T.npy R.png out.json N [mask.npy] [--sig 12,24,48] [--down 2] [--blur 6]
# Greedy fit of soft tone-correction blobs so that blur(R') matches blur(T) (both pre-grade values 0..1):
#   a < 0: R' = R * (1 + a g)   (canvas 'multiply' with a radial grey gradient)
#   a > 0: R' = R (1 + a g)     (gain: the plate times a light mask, added; black stays black)
#          (with --screen instead: R' = R + a g (1 - R), canvas 'screen')
# g = exp(-d^2 / 2 s^2). Writes [[x, y, s, a], ...] in full-res frame px (canvas coords).
import sys, json, numpy as np, cv2, math
a = sys.argv
T = np.load(a[1]).astype(np.float32); R = cv2.imread(a[2], 0).astype(np.float32) / 255 if a[2].endswith('.png') else np.load(a[2]).astype(np.float32)
out = a[3]; N = int(a[4])
M = np.load(a[5]) if len(a) > 5 and a[5].endswith('.npy') else np.ones_like(T, bool)
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
GAIN = '--screen' not in a
sigs = [float(v) for v in opt('--sig', '12,24,48').split(',')]; dn = int(opt('--down', 2)); bl = float(opt('--blur', 6))
M = M.astype(np.float32)
if (T < 0).any(): M = M * (T >= 0)
T = np.where(T < 0, R, T)
bT = cv2.GaussianBlur(T, (0, 0), bl); bR = cv2.GaussianBlur(R, (0, 0), bl)
sz = (T.shape[1] // dn, T.shape[0] // dn)
bT = cv2.resize(bT, sz, interpolation=cv2.INTER_AREA); bR = cv2.resize(bR, sz, interpolation=cv2.INTER_AREA)
Mw = cv2.resize(cv2.erode(M, np.ones((9, 9), np.uint8)), sz, interpolation=cv2.INTER_AREA)
Mw = (Mw > 0.99).astype(np.float32)
H, W = bT.shape
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
blobs = []; B = bR.copy()
e0 = np.abs(bT - B)[Mw > 0].mean()
for it in range(N):
    r = (bT - B) * Mw
    best = None
    for s_full in sigs:
        s = s_full / dn
        for sign in (-1, 1):
            w = (B if (sign < 0 or GAIN) else 1 - B) * Mw
            num = cv2.GaussianBlur(r * w, (0, 0), s) * (2 * math.pi * s * s)
            den = cv2.GaussianBlur(w * w, (0, 0), s / math.sqrt(2)) * (math.pi * s * s) + 1e-6
            A = num / den
            A = np.clip(A, -0.85, 0) if sign < 0 else np.clip(A, 0, 0.85)
            red = 2 * A * num - A * A * den
            i = int(np.argmax(red)); v = red.flat[i]
            if best is None or v > best[0]: best = (v, i % W, i // W, s, float(A.flat[i]), s_full)
    v, x, y, s, amp, sf = best
    if v <= 1e-5 or abs(amp) < 0.004: break
    g = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * s * s))
    B = B * (1 + amp * g) if (amp < 0 or GAIN) else B + amp * g * (1 - B)
    if GAIN: B = np.minimum(B, 1)
    blobs.append([round((x + 0.5) * dn, 1), round((y + 0.5) * dn, 1), sf, round(amp, 4)])
e1 = np.abs(bT - B)[Mw > 0].mean()
print(f'blobs {len(blobs)} blurred MAE (pre-grade x255) {e0*255:.2f} -> {e1*255:.2f}')
json.dump(blobs, open(out, 'w'))
