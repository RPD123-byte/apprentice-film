# s14 round 3 measurement helpers (not loaded by the film). Reads source frames only to measure; writes numbers.
import cv2, numpy as np, re, json, os, math
ROOT = '/Users/computer/rootline/apprentice-film'
MEAS = ROOT + '/snapshots/s14-r3-meas'
W, H = 2206, 946

def src(t):
    p = f'{MEAS}/src{t:.2f}.png'
    if not os.path.exists(p):
        os.system(f'sh {ROOT}/tools/refframe.sh {t:.2f} {p}')
    return cv2.imread(p)

def luma(img):
    img = img.astype(np.float32) / 255.0
    return 0.114 * img[..., 0] + 0.587 * img[..., 1] + 0.299 * img[..., 2]

# the global grade (src/lib/post.js), without halation and grain
_f = np.linspace(0, 1, 4096)
_s = _f * 0.65 + 0.35 * (_f * _f * (3 - 2 * _f))
def scurve(f): return f * 0.65 + 0.35 * (f * f * (3 - 2 * f))
def inv_scurve(y): return np.interp(np.clip(y, 0, 1), _s, _f)
def vignette():
    x = (np.arange(W) + 0.5) / W * 2 - 1; y = (np.arange(H) + 0.5) / H * 2 - 1
    X, Y = np.meshgrid(x, y)
    r = np.clip((X * X + Y * Y) / 2, 0, 1)
    return 1 - 0.38 * r ** 1.15
VIG = vignette()
def flicker(t): return 1 + 0.018 * math.sin(t * 2 * math.pi * 0.9) + 0.012 * math.sin(t * 2 * math.pi * 2.3 + 1.0)
def pregrade(L, t):
    """source luma (0..1) -> the pre-grade value that the grade would map to it (no halation)"""
    return inv_scurve(L / (VIG * flicker(t)))

def load_js_obj(path, name):
    s = open(path).read()
    i = s.index('export const ' + name)
    s = s[s.index('{', i):]
    # find matching brace
    depth = 0
    for k, ch in enumerate(s):
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: s = s[:k + 1]; break
    s = re.sub(r'//[^\n]*', '', s)
    s = re.sub(r',\s*([}\]])', r'\1', s)
    return json.loads(s)

def geo():
    return load_js_obj(ROOT + '/src/shots/s14/geo3.js', 'GEO')

LCOL = {'left': (0, 0, 255), 'right': (0, 255, 0), 'synth': (255, 0, 255), 'back': (160, 160, 160), 'floor': (0, 255, 255),
        'aside': (255, 128, 0), 'under': (255, 255, 0), 'deskBase': (0, 128, 255), 'deskTop': (255, 0, 0), 'ceiling': (200, 200, 255)}

def shape_pts(sh, n=48):
    if isinstance(sh, dict) and 'e' in sh:
        cx, cy, rx, ry, rot = sh['e']
        c, s_ = math.cos(rot), math.sin(rot)
        return [[cx + rx * math.cos(2 * math.pi * i / n) * c - ry * math.sin(2 * math.pi * i / n) * s_,
                 cy + rx * math.cos(2 * math.pi * i / n) * s_ + ry * math.sin(2 * math.pi * i / n) * c] for i in range(n)]
    return sh

def overlay(img, G, crop=None, scale=2, grid=50, only=None, label=True):
    img = img.copy()
    x0, y0, x1, y1 = crop or (0, 0, W, H)
    im = cv2.resize(img[y0:y1, x0:x1], None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    for gx in range((x0 // grid) * grid, x1 + 1, grid):
        X = int((gx - x0) * scale)
        if 0 <= X < im.shape[1]:
            cv2.line(im, (X, 0), (X, im.shape[0]), (0, 90, 140), 1)
            cv2.putText(im, str(gx), (X + 2, 12), 0, 0.4, (0, 200, 255), 1)
    for gy in range((y0 // grid) * grid, y1 + 1, grid):
        Y = int((gy - y0) * scale)
        if 0 <= Y < im.shape[0]:
            cv2.line(im, (0, Y), (im.shape[1], Y), (0, 90, 140), 1)
            cv2.putText(im, str(gy), (2, Y - 2), 0, 0.4, (0, 200, 255), 1)
    for name, e in G.items():
        L, pts = e[0], shape_pts(e[1])
        if only and not any(name.startswith(o) for o in only): continue
        P = np.array([[(p[0] - x0) * scale, (p[1] - y0) * scale] for p in pts], np.int32)
        closed = not (len(e) > 2 and isinstance(e[2], dict) and e[2].get('open'))
        cv2.polylines(im, [P], closed, LCOL.get(L, (255, 255, 255)), 1, cv2.LINE_AA)
        if label:
            c = P.mean(0).astype(int)
            cv2.putText(im, name.split('.', 1)[-1], (int(c[0]) - 20, int(c[1])), 0, 0.35, LCOL.get(L, (255, 255, 255)), 1, cv2.LINE_AA)
    return im
