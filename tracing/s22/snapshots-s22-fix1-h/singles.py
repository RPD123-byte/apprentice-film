# singles.py: cup-local crops of single source frames (and render frames) of the cut drawing, 4x, with grid
import sys, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src
txt = open('../../src/shots/s22.js').read()
K = {n: eval(re.search(rf'const {n} = (\[\[.*?\]\]);', txt).group(1)) for n in ['TOP_CUP', 'RIGHT_CUP', 'BOT_CUP', 'LEFT_CUP']}
R = {0: np.array([[1, 0], [0, 1]]), 1: np.array([[0, -1], [1, 0]]), 2: np.array([[-1, 0], [0, -1]]), 3: np.array([[0, 1], [-1, 0]])}
def cupat(F):
    t = F / 25
    for side, n in enumerate(['TOP_CUP', 'RIGHT_CUP', 'BOT_CUP', 'LEFT_CUP']):
        for k in K[n]:
            if abs(k[0] - t) < 1e-3: return side, k[1] + (0.48 if side == 0 else 0), k[2]
    return None
def crop(im, cx, cy, side, box, S=8):
    X0, Y0, X1, Y1 = box
    M = np.zeros((2, 3), np.float32); Rm = R[side]
    M[:, :2] = Rm / S
    M[:, 2] = np.array([cx, cy]) + Rm @ np.array([X0 + 0.5 / S - 0.5, Y0 + 0.5 / S - 0.5])
    return cv2.warpAffine(im.astype(np.float32), M, ((X1 - X0) * S, (Y1 - Y0) * S), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
def grid(x, box, S=8, st=5):
    X0, Y0, X1, Y1 = box; x = np.clip(x, 0, 255).astype(np.uint8).copy()
    for u in range((X0 // st) * st, X1, st):
        X = (u - X0) * S
        if X < 0: continue
        cv2.line(x, (X, 0), (X, x.shape[0]), (0, 0, 255) if u % 10 == 0 else (0, 90, 0), 1)
        if u % 10 == 0: cv2.putText(x, str(u), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
    for v in range((Y0 // st) * st, Y1, st):
        Y = (v - Y0) * S
        if Y < 0: continue
        cv2.line(x, (0, Y), (x.shape[1], Y), (0, 0, 255) if v % 10 == 0 else (0, 90, 0), 1)
        if v % 10 == 0: cv2.putText(x, str(v), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
    return x
if __name__ == '__main__':
    out = sys.argv[1]; box = [int(v) for v in sys.argv[2].split(',')]; items = sys.argv[3:]
    tiles = []
    for it in items:
        if ':' in it: d, F = it.split(':'); F = int(F); im = cv2.imread(f'{d}/r{F:04d}.png')
        else: F = int(it); im = src(F)
        s, cx, cy = cupat(F)
        tiles.append(grid(crop(im, cx, cy, s, box), box))
    cv2.imwrite(out, np.hstack(tiles)); print(out)
