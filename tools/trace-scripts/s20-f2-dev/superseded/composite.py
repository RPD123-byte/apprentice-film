# Clean-room measurement composite (NOT loaded by the film): every source frame of s20 is un-graded (grade_inv),
# setup-B frames are warped back into the setup-A frame with the measured per-frame camera, and a robust temporal
# median over the frames where a pixel is not covered by a moving thing (owl, dust, card, glint) gives the static room.
# Output: snapshots/s20-f2-trace/clean.npy (float32 0..1, A-frame coords + margin M on every side), clean.png (view).
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import grade_inv as G
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s20-rev1-src/n%d.png'
OUT = '/Users/computer/rootline/apprentice-film/snapshots/s20-f2-trace'
os.makedirs(OUT, exist_ok=True)
M = 60; W, H = 2206, 946
B1 = [0.9846, -0.0002, 0.0000, 0.9703, 0.95, -3.6]
B2 = [0.9910, -0.0004, -0.0004, 0.9646, -8.15, 1.3]
CAM = {1685: [0.9862, -0.0002, -0.0011, 0.9690, -0.42, -2.61], 1686: [0.9888, -0.0003, -0.0001, 0.9669, -5.16, -0.39], 1687: [0.9908, -0.0006, -0.0005, 0.9648, -7.93, 1.73]}
def cam(n):
    if n < 1671: return None
    if n < 1685: return B1
    return CAM.get(n, B2)
frames = [n for n in range(1578, 1736) if not (1684 <= n <= 1695)]   # skip the whirl / camera-step frames
def load(n):
    g = cv2.cvtColor(cv2.imread(SRC % n), cv2.COLOR_BGR2GRAY)
    f = G.inverse(g, n / 25).astype(np.float32)
    c = cam(n)
    if c is None:
        A = np.array([[1, 0, -M], [0, 1, -M]], np.float32)       # dst (X,Y) -> src (X-M, Y-M)
    else:
        a, b, cc, d, e, ff = c
        A = np.array([[a, cc, e - a * M - cc * M], [b, d, ff - b * M - d * M]], np.float32)
    valid = cv2.warpAffine(np.ones_like(f), A, (W + 2 * M, H + 2 * M), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=0)
    img = cv2.warpAffine(f, A, (W + 2 * M, H + 2 * M), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=0)
    return img, valid > 0.999
if __name__ == '__main__':
    stack = []; val = []
    for n in frames:
        i, v = load(n); stack.append(i.astype(np.float16)); val.append(v)
    S = np.stack(stack).astype(np.float32); V = np.stack(val)
    S[~V] = np.nan
    np.save(OUT + '/stack_frames.npy', np.array(frames))
    bg1 = np.nanpercentile(S, 25, axis=0)
    np.save(OUT + '/bg1.npy', bg1.astype(np.float32))
    # pass 2: foreground = differs from bg1 after blur, dilated
    b1 = cv2.GaussianBlur(np.nan_to_num(bg1), (0, 0), 2)
    for k in range(len(frames)):
        fk = cv2.GaussianBlur(np.nan_to_num(S[k]), (0, 0), 2)
        fg = (np.abs(fk - b1) > 0.08).astype(np.uint8)
        fg = cv2.dilate(fg, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
        S[k][fg > 0] = np.nan
    cnt = np.sum(~np.isnan(S), axis=0)
    bg2 = np.nanmedian(S, axis=0)
    bg2 = np.where(cnt >= 3, bg2, bg1)
    np.save(OUT + '/clean.npy', np.nan_to_num(bg2).astype(np.float32))
    np.save(OUT + '/cnt.npy', cnt.astype(np.int16))
    cv2.imwrite(OUT + '/clean.png', np.clip(np.nan_to_num(bg2) * 255, 0, 255).astype(np.uint8))
    cv2.imwrite(OUT + '/cnt.png', np.clip(cnt * 2, 0, 255).astype(np.uint8))
    print('done', S.shape, 'pixels with <3 clean frames', int((cnt < 3).sum()))
