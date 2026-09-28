# edgecmp.py DIR [tag]: aligned (cup track) median of rendered edge frames vs the source's median: owl-footprint stats
import sys, re, cv2, numpy as np, glob, os
sys.path.insert(0, '.')
txt = open('../../src/shots/s22.js').read()
TOP = eval(re.search(r'const TOP_CUP = (\[\[.*?\]\]);', txt).group(1)); BOT = eval(re.search(r'const BOT_CUP = (\[\[.*?\]\]);', txt).group(1))
X0, Y0, X1, Y1, S = -140, -80, 240, 130, 4
def crop_img(im, cx, cy, rot):
    R = {0: np.array([[1, 0], [0, 1]]), 2: np.array([[-1, 0], [0, -1]])}[rot]
    w, h = (X1 - X0) * S, (Y1 - Y0) * S
    Mx = np.zeros((2, 3), np.float32); Mx[:, :2] = R / S
    Mx[:, 2] = np.array([cx, cy]) + R @ np.array([X0 + 0.5 / S - 0.5, Y0 + 0.5 / S - 0.5])
    return cv2.warpAffine(im.astype(np.float32), Mx, (w, h), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
d = sys.argv[1]; tag = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(d)
have = {int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png')}
for side, rot, keys in [('top', 0, TOP), ('bot', 2, BOT)]:
    K = {round(t * 25): (x, y) for t, x, y in keys}
    Fs = sorted(F for F in have if F in K and ((1870 <= F <= 1913) if side == 'top' else (1938 <= F <= 1978)))
    if not Fs: continue
    st = [cv2.cvtColor(crop_img(cv2.imread(f'{d}/r{F:04d}.png'), *K[F], rot), cv2.COLOR_BGR2GRAY) for F in Fs]
    Rm = cv2.GaussianBlur(np.median(np.stack(st), 0), (0, 0), 4)
    Sm = cv2.GaussianBlur(cv2.imread(f'../s22-p4-meas/edge_{side}_med.png', 0).astype(np.float32), (0, 0), 4)
    D = Rm - Sm; m = cv2.GaussianBlur(Sm, (0, 0), 8) > 120
    dark = m & (Sm < 150); lite = m & (Sm >= 200)
    ring = (cv2.dilate(m.astype(np.uint8), np.ones((61, 61), np.uint8)) > 0) & ~m
    print(f'{tag} {side} n={len(Fs)} owl MAE {np.abs(D[m]).mean():5.2f} bias {D[m].mean():+6.2f} | darks {D[dark].mean():+6.2f} lights {D[lite].mean():+6.2f} | halo ring {D[ring].mean():+6.2f} (MAE {np.abs(D[ring]).mean():.2f})')
    v = np.clip(D / 60, -1, 1); im = np.zeros(Sm.shape + (3,), np.uint8)
    im[..., 2] = (np.clip(v, 0, 1) * 255).astype(np.uint8); im[..., 0] = (np.clip(-v, 0, 1) * 255).astype(np.uint8); im[..., 1] = (Sm * 0.35).astype(np.uint8)
    cv2.imwrite(f'{d}/edgediff_{side}.jpg', cv2.resize(im, None, fx=0.5, fy=0.5), [cv2.IMWRITE_JPEG_QUALITY, 88])
