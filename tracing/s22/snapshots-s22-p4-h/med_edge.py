# median of the source's top-side owl drawing, aligned on the measured cup track (cup-local px); measuring only
import sys, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src
txt = open('../../src/shots/s22.js').read()
TOP = eval(re.search(r'const TOP_CUP = (\[\[.*?\]\]);', txt).group(1))
BOT = eval(re.search(r'const BOT_CUP = (\[\[.*?\]\]);', txt).group(1))
X0, Y0, X1, Y1 = -140, -80, 240, 130   # cup-local box
S = 4
def crop(F, cx, cy, rot):
    im = src(F).astype(np.float32)
    # map cup-local (u,v) -> frame: p = cup + R (u,v); R per side
    R = {0: np.array([[1, 0], [0, 1]]), 2: np.array([[-1, 0], [0, -1]])}[rot]
    w, h = (X1 - X0) * S, (Y1 - Y0) * S
    # output pixel (i,j) -> u = X0 + (i+0.5)/S - 0.5 ... pixel-index coords
    M = np.zeros((2, 3), np.float32)
    M[:, :2] = R / S
    M[:, 2] = np.array([cx, cy]) + R @ np.array([X0 + 0.5 / S - 0.5, Y0 + 0.5 / S - 0.5])
    return cv2.warpAffine(im, M, (w, h), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
if __name__ != "__main__": raise SystemExit
side = sys.argv[1] if len(sys.argv) > 1 else 'top'
keys = TOP if side == 'top' else BOT
fr = [(round(t * 25), x, y) for t, x, y in keys if (74.79 < t < 76.53 if side == 'top' else 77.5 < t < 79.2)]
st = np.stack([crop(F, x, y, 0 if side == 'top' else 2) for F, x, y in fr])
med = np.median(st, 0)
cv2.imwrite(f'../s22-p4-meas/edge_{side}_med.png', np.clip(med, 0, 255).astype(np.uint8))
print(len(fr), med.shape)
