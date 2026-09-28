import cv2, glob, re, sys, numpy as np
# per-window offset of render vs source (positive dx = render is to the right of the source)
d = sys.argv[1]
wins = {k: v for k, v in [a.split('=') for a in sys.argv[2:]]} if len(sys.argv) > 2 else None
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
def grad(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), 2.0)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
    m = np.sqrt(gx * gx + gy * gy)
    return cv2.GaussianBlur(m, (0, 0), 3.0)
R = 70
for f in fs:
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    r = cv2.imread(f); s = cv2.imread(f.replace('frame-', 'ref-'))
    gr, gs = grad(r), grad(s)
    out = []
    for name, box in wins.items():
        x0, y0, x1, y1 = map(int, box.split(','))
        tpl = gr[y0:y1, x0:x1]
        X0, Y0 = max(0, x0 - R), max(0, y0 - R); X1, Y1 = min(gs.shape[1], x1 + R), min(gs.shape[0], y1 + R)
        res = cv2.matchTemplate(gs[Y0:Y1, X0:X1], tpl, cv2.TM_CCOEFF_NORMED)
        _, mv, _, ml = cv2.minMaxLoc(res)
        dx = x0 - (X0 + ml[0]); dy = y0 - (Y0 + ml[1])
        out.append(f'{name}:{dx:+4d},{dy:+4d} ({mv:.2f})')
    print(f'{t:7.2f} ' + '  '.join(out))
