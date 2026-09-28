# end-s27-rev1: global tone stats (render and film.mp4 vs source): mean L, a, b; L std (contrast) after sigma2 blur;
# fine texture = std of (img - sigma1.5 blur) on L; saturation (chroma mean). Per frame, printed for a subset.
import cv2, numpy as np, sys, json
W = sys.argv[1]; frames = list(map(int, sys.argv[2].split(',')))
def st(p):
    im = cv2.imread(p).astype(np.float32) / 255
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2Lab)
    L = lab[..., 0]; a = lab[..., 1]; b = lab[..., 2]
    Lb = cv2.GaussianBlur(L, (0, 0), 2)
    hp = L - cv2.GaussianBlur(L, (0, 0), 1.5)
    return [L.mean(), a.mean(), b.mean(), Lb.std(), hp.std(), np.sqrt(a**2 + b**2).mean(), np.percentile(L, 5), np.percentile(L, 95)]
print('F      t    | L     a     b    Lstd  fine  chroma p5  p95  (SRC / NOW / film)')
for F in frames:
    s = st(f'{W}/src/s{F}.png'); r = st(f'{W}/render/r{F}.png'); f = st(f'{W}/film/f{F}.png')
    fmt = lambda v: ' '.join(f'{x:5.1f}' for x in v)
    print(F, F / 25, '\n  SRC', fmt(s), '\n  NOW', fmt(r), '\n  FLM', fmt(f))
