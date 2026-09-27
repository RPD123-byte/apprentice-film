# chain dense flow (Farneback, FLOW2) from a start frame forward/backward for given points; draw tracks on a strip
import cv2, numpy as np, sys, json
from common import *
def flow_at(a, b, pts):
    d = np.load(f'{FLOW}/fl_{a}_{b}.npz' if a < b else f'{FLOW}/fl_{b}_{a}.npz')
    fl = (d['fw'] if a < b else d['bw']).astype(np.float32)
    out = []
    for x, y in pts:
        xi, yi = x / 2, y / 2
        x0, y0 = int(np.clip(xi, 2, fl.shape[1] - 3)), int(np.clip(yi, 2, fl.shape[0] - 3))
        v = fl[y0 - 2:y0 + 3, x0 - 2:x0 + 3].reshape(-1, 2)
        out.append(np.median(v, 0))
    return np.array(out)
def chain(start, frames, pts):
    i0 = frames.index(start); T = {start: np.array(pts, float)}
    p = np.array(pts, float)
    for a, b in zip(frames[i0:-1], frames[i0 + 1:]): p = p + flow_at(a, b, p); T[b] = p.copy()
    p = np.array(pts, float)
    for a, b in zip(frames[i0:0:-1], frames[i0 - 1::-1]): p = p + flow_at(a, b, p); T[b] = p.copy()
    return T
if __name__ == '__main__':
    start = int(sys.argv[1]); f0, f1 = int(sys.argv[2]), int(sys.argv[3]); pts = json.loads(sys.argv[4]); out = sys.argv[5]
    frames = [f for f in FRAMES if f0 <= f <= f1]
    T = chain(start, frames, pts)
    tiles = []
    for f in frames:
        im = cv2.cvtColor(cv2.imread(f'{SRC}/f{f}.png', 0), cv2.COLOR_GRAY2BGR)
        for k, (x, y) in enumerate(T[f]):
            c = [(0, 0, 255), (0, 255, 0), (255, 0, 0), (0, 255, 255), (255, 0, 255), (255, 255, 0), (0, 128, 255), (128, 0, 255)][k % 8]
            cv2.circle(im, (int(x), int(y)), 14, c, 4); cv2.putText(im, str(k), (int(x) + 16, int(y)), 0, 1.4, c, 3)
        cv2.putText(im, f'{f/25:.2f}', (20, 60), 0, 2, (0, 255, 255), 4)
        tiles.append(cv2.resize(im, (736, 316)))
    while len(tiles) % 3: tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)]), [cv2.IMWRITE_JPEG_QUALITY, 80])
    json.dump({str(k): v.tolist() for k, v in T.items()}, open(out + '.json', 'w'))
