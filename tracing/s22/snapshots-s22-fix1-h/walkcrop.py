# walkcrop.py: crops in the walk drawing's own anchor-local coords (s22 WALK_T per source pose)
import sys, json, subprocess, cv2, numpy as np
sys.path.insert(0, '.')
from singles import grid
from run import src
W = json.loads(subprocess.run(['node', '-e', "import('../../src/shots/s22/owlData.js').then(m=>console.log(JSON.stringify(m.TRACED.walk.meta.warp)))"], capture_output=True, text=True).stdout)
WT = sorted((float(t), m) for t, m in W.items())
def walkT(F):
    t = F / 25; cur = None
    for tt, m in WT:
        if tt <= t + 1e-6: cur = m
    return cur
def crop(im, m, box, S=8):
    a, b, c, d, e, f = m; X0, Y0, X1, Y1 = box
    M = np.float32([[a / S, c / S, a * (X0 + 0.5 / S - 0.5) + c * (Y0 + 0.5 / S - 0.5) + e], [b / S, d / S, b * (X0 + 0.5 / S - 0.5) + d * (Y0 + 0.5 / S - 0.5) + f]])
    return cv2.warpAffine(im.astype(np.float32), M, ((X1 - X0) * S, (Y1 - Y0) * S), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
if __name__ == '__main__':
    out = sys.argv[1]; box = [int(v) for v in sys.argv[2].split(',')]; S = int(sys.argv[3]); items = sys.argv[4:]
    tiles = []
    for it in items:
        if ':' in it: dd, F = it.split(':'); F = int(F); im = cv2.imread(f'{dd}/r{F:04d}.png')
        else: F = int(it); im = src(F)
        tiles.append(grid(crop(im, walkT(F), box, S).clip(0, 255).astype(np.uint8), box, S, 5))
    cv2.imwrite(out, np.hstack(tiles) if len(tiles) < 4 else np.vstack([np.hstack(tiles[i:i + 2]) for i in range(0, len(tiles), 2)])); print(out)
