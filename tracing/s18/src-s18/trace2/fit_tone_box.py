# fit_tone_box.py T.npy R.npy out.json N x0 y0 x1 y1 [--sig 16,32] [--blur 4] [--reach 96]
# fit_tone.py restricted for a local fix (fix pass 1b, the take-off headphone cup): blob centres only inside the box
# [x0, y0, x1, y1]; the error is measured over the box grown by --reach (every pixel the blobs can touch) inside the
# drawn owl (R > 0.15), so a blob's tail may not spoil the owl round the box. Pre-grade values 0..1.
import sys, json, math, numpy as np, cv2
a = sys.argv
T = np.load(a[1]).astype(np.float32); R = np.load(a[2]).astype(np.float32); out = a[3]; N = int(a[4])
bx0, by0, bx1, by1 = map(int, a[5:9])
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
sigs = [float(v) for v in opt('--sig', '16,32').split(',')]; bl = float(opt('--blur', 4)); reach = int(opt('--reach', 96))
H, W = T.shape
M = np.zeros_like(T); M[max(0, by0 - reach):by1 + reach, max(0, bx0 - reach):bx1 + reach] = 1
M *= (cv2.dilate((R > 0.15).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0)
M = (cv2.erode(M, np.ones((5, 5), np.uint8)) > 0).astype(np.float32)
C = np.zeros_like(T, bool); C[by0:by1, bx0:bx1] = True   # allowed centres
bT = cv2.GaussianBlur(T, (0, 0), bl); bR = cv2.GaussianBlur(R, (0, 0), bl)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
B = bR.copy(); blobs = []
e0 = np.abs(bT - B)[M > 0].mean()
for it in range(N):
    r = (bT - B) * M; best = None
    for s in sigs:
        for sign in (-1, 1):
            w = B * M
            num = cv2.GaussianBlur(r * w, (0, 0), s) * (2 * math.pi * s * s)
            den = cv2.GaussianBlur(w * w, (0, 0), s / math.sqrt(2)) * (math.pi * s * s) + 1e-6
            A = num / den
            A = np.clip(A, -0.85, 0) if sign < 0 else np.clip(A, 0, 0.85)
            red = np.where(C, 2 * A * num - A * A * den, -1)
            i = int(np.argmax(red)); v = red.flat[i]
            if best is None or v > best[0]: best = (v, i % W, i // W, s, float(A.flat[i]))
    v, x, y, s, amp = best
    if v <= 1e-5 or abs(amp) < 0.004: break
    g = np.exp(-((xx - x - 0.5) ** 2 + (yy - y - 0.5) ** 2) / (2 * s * s))
    B = np.minimum(B * (1 + amp * g), 1)
    blobs.append([round(x + 0.5, 1), round(y + 0.5, 1), s, round(amp, 4)])
e1 = np.abs(bT - B)[M > 0].mean()
print(f'blobs {len(blobs)} blurred MAE over the reach (pre-grade x255) {e0*255:.2f} -> {e1*255:.2f}')
json.dump(blobs, open(out, 'w'))
