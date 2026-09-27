# Low-frequency pre-grade colour gain (source / render) for the locked view: median over the locked frames of a sweep,
# blurred (sigma 36 px), the lid excluded (filled from around it), clamped, on a 1/32 grid. -> corr.json
import sys, glob, re, json; sys.path.insert(0, '.')
from geo import *
import grade28 as GR
dirs = sys.argv[1:]
sc = 8; h, w = H // sc + 1, W // sc + 1
lidm = np.zeros((H, W), np.uint8); cv2.fillPoly(lidm, [np.int32(lidQuad(131.4) + [[0, -12], [0, -12], [0, 40], [0, 40]])], 1)
lidm = cv2.dilate(lidm, np.ones((31, 31), np.uint8))
valid = (1 - lidm).astype(np.float32)
V_ = cv2.resize(valid, (w, h), interpolation=cv2.INTER_AREA)
G = []
for d in dirs:
    for fp in sorted(glob.glob(d + '/frame-*.png')):
        t = float(re.search(r'at-([\d.]+)s', fp).group(1))
        if t < 131.6 or t > 135.7: continue
        a = cv2.imread(fp)[..., ::-1].astype(np.float32) / 255
        b = frame(round(t * 25))[..., ::-1].astype(np.float32) / 255
        pa = GR.ungrade(a, t); pb = GR.ungrade(b, t)
        A = cv2.resize(pa * valid[..., None], (w, h), interpolation=cv2.INTER_AREA)
        B = cv2.resize(pb * valid[..., None], (w, h), interpolation=cv2.INTER_AREA)
        s = 36 / sc
        Ab = cv2.GaussianBlur(A, (0, 0), s); Bb = cv2.GaussianBlur(B, (0, 0), s); Vb = cv2.GaussianBlur(V_, (0, 0), s)[..., None]
        g = (Bb / np.maximum(Vb, 1e-3) + 0.01) / (Ab / np.maximum(Vb, 1e-3) + 0.01)
        G.append(g)
        print(t, g.reshape(-1, 3).mean(0).round(3), flush=True)
G = np.median(np.array(G), 0)
# fill the lid area from its surroundings (normalized convolution with a wide kernel)
# the lid is drawn over this area afterwards: no correction there
G = np.where(V_[..., None] > 0.5, G, 1.0)
G = np.clip(G, 0.85, 1.2)
g32 = cv2.resize(G, (W // 32 + 1, H // 32 + 1), interpolation=cv2.INTER_AREA)
print('grid', g32.shape, 'range', g32.min().round(3), g32.max().round(3), 'mean', g32.reshape(-1, 3).mean(0).round(3))
json.dump({'w': g32.shape[1], 'h': g32.shape[0], 'g': [int(round((v - 0.5) * 255)) for v in g32.reshape(-1)]}, open('corr.json', 'w'))
