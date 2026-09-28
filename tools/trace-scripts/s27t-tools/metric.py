# Frame-exact metrics vs the source. usage: metric.py RENDERDIR [label] [--film] [--frames a-b]
# RENDERDIR has frame-<k>.png (k = 25 fps frame index). Reference frames: $REF/src/<k>.png, $REF/film/<k>.png.
# Per frame: ΔE76 on σ8-blurred Lab (full frame), mean abs RGB diff (0-255) after σ4 and σ12 blur.
import cv2, numpy as np, sys, os, glob, re
REF = os.environ.get('REF', '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref')
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im, (0, 0), s).astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
def met(R, S):
    de = np.linalg.norm(lab(R, 8) - lab(S, 8), axis=2).mean()
    a4 = np.abs(cv2.GaussianBlur(R.astype(np.float32), (0, 0), 4) - cv2.GaussianBlur(S.astype(np.float32), (0, 0), 4)).mean()
    a12 = np.abs(cv2.GaussianBlur(R.astype(np.float32), (0, 0), 12) - cv2.GaussianBlur(S.astype(np.float32), (0, 0), 12)).mean()
    return de, a4, a12
d = sys.argv[1]
fs = sorted(glob.glob(os.path.join(d, 'frame-*.png')))
film = '--film' in sys.argv
rows = []
print(f'{"t":>7} {"k":>5}   render ΔE8  σ4   σ12' + ('   |  film.mp4 ΔE8  σ4   σ12' if film else ''))
for f in fs:
    k = int(re.search(r'frame-(\d+)', f).group(1))
    S = cv2.imread(os.path.join(REF, 'src', '%05d.png' % k))
    R = cv2.imread(f)
    m = met(R, S)
    line = f'{k/25:7.2f} {k:5d}   {m[0]:6.2f} {m[1]:6.2f} {m[2]:6.2f}'
    if film:
        F = cv2.imread(os.path.join(REF, 'film', '%05d.png' % k)); mf = met(F, S)
        line += f'   |  {mf[0]:6.2f} {mf[1]:6.2f} {mf[2]:6.2f}'
        rows.append((k, *m, *mf))
    else: rows.append((k, *m))
    print(line, flush=True)
A = np.array(rows)
def seg(lo, hi, name):
    s = A[(A[:, 0] >= round(lo * 25)) & (A[:, 0] <= round(hi * 25))]
    if len(s) == 0: return
    out = f'{name:22s} n={len(s):3d}  render {s[:,1].mean():5.2f} {s[:,2].mean():5.2f} {s[:,3].mean():5.2f}'
    if film: out += f'  | film {s[:,4].mean():5.2f} {s[:,5].mean():5.2f} {s[:,6].mean():5.2f}'
    print(out)
print('--- means (ΔE8, σ4, σ12)')
for lo, hi, n in [(117.52, 117.9, 'whip 117.52-117.90'), (117.92, 119.8, 'hold 117.92-119.8'), (119.8, 124.6, 'turn 119.8-124.6'),
                  (124.8, 126.3, 'hold 124.8-126.3'), (126.32, 127.5, 'owl 126.32-127.5'), (127.6, 128.4, 'orbit 127.6-128.4'),
                  (128.44, 128.8, 'lid edge 128.44-128.8'), (128.84, 129.28, 'end 128.84-129.28'), (117.52, 129.28, 'ALL')]:
    seg(lo, hi, n)
