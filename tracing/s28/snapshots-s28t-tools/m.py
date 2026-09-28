# s28t: per-frame metrics of harness renders vs the source (and the baseline film render) by exact 25 fps frame index.
# Usage: m.py DIR [--base] [--pairs OUT] [--quiet]
import cv2, numpy as np, sys, glob, re, os
SRC = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
FILM = '/Users/computer/rootline/apprentice-film/renders/film.mp4'
caps = {}
def frame(path, k):
    c = caps.get(path)
    if c is None: c = caps[path] = [cv2.VideoCapture(path), -10]
    if c[1] + 1 != k: c[0].set(cv2.CAP_PROP_POS_FRAMES, k)
    ok, f = c[0].read(); c[1] = k
    assert ok, (path, k)
    return f
def bl(a, s): return cv2.GaussianBlur(a.astype(np.float32), (0, 0), s)
def d(a, b, s): return float(np.abs(bl(a, s) - bl(b, s)).mean())
if __name__ == '__main__':
    D = sys.argv[1]; base = '--base' in sys.argv
    pairs = sys.argv[sys.argv.index('--pairs') + 1] if '--pairs' in sys.argv else None
    if pairs: os.makedirs(pairs, exist_ok=True)
    fs = sorted(glob.glob(D + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
    rows = []
    for p in fs:
        t = float(re.search(r'at-([\d.]+)s', p).group(1)); tf = np.floor(t * 30 + 1e-6) / 30; k = int(np.ceil(tf * 25 - 1e-6))
        r = cv2.imread(p); s = frame(SRC, k)
        row = [k / 25, d(r, s, 4), d(r, s, 12)]
        if base:
            b = frame(FILM, k); row += [d(b, s, 4), d(b, s, 12)]
        rows.append(row)
        if pairs:
            top = np.hstack([r, s]) if not base else np.hstack([b, r, s])
            h = top.shape[0] // 3; w = top.shape[1] // 3
            cv2.imwrite(f'{pairs}/pair-{k/25:.2f}.jpg', cv2.resize(top, (w, h), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
        if '--quiet' not in sys.argv:
            print(f'{k/25:7.2f}  new s4 {row[1]:5.2f} s12 {row[2]:5.2f}' + (f'   film s4 {row[3]:5.2f} s12 {row[4]:5.2f}' if base else ''))
    a = np.array(rows)
    print('MEAN new s4 %.2f s12 %.2f' % (a[:, 1].mean(), a[:, 2].mean()) + ('   film s4 %.2f s12 %.2f' % (a[:, 3].mean(), a[:, 4].mean()) if base else ''))
    np.save(D + '/metrics.npy', a)
