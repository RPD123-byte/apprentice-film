# s13 fix1 measurement helpers: load the shot's JS data modules, source frames, part masks, the grade model.
import re, json, cv2, numpy as np
ROOT = '/Users/computer/rootline/apprentice-film'
SRC = ROOT + '/snapshots/s13-w3-src'
def jsdata(name, var=None):
    s = open(f'{ROOT}/src/shots/s13/{name}.js').read()
    s = re.sub(r'//[^\n]*', '', s)
    m = re.search(r'export const (\w+)\s*=\s*', s) if var is None else re.search(r'export const ' + var + r'\s*=\s*', s)
    body = s[m.end():]
    # cut at the next "export" or end
    k = body.find('export const'); body = body[:k] if k >= 0 else body
    body = body.strip().rstrip(';')
    body = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', body)
    body = re.sub(r',\s*([\]}])', r'\1', body)
    return json.loads(body)
def src(f):
    if isinstance(f, str) and '-' in f:
        a, b = map(int, f.split('-')); return np.median(np.stack([cv2.imread(f'{SRC}/f{i}.png', 0) for i in range(a, b + 1)]), 0).astype(np.float32)
    return cv2.imread(f'{SRC}/f{int(f)}.png', 0).astype(np.float32)
def ringmask(rings, shape=(946, 2206)):
    m = np.zeros(shape, np.uint8)
    for r in rings:
        t = np.zeros_like(m); p = np.array(r, np.float32).reshape(-1, 2); cv2.fillPoly(t, [np.round(p * 16).astype(np.int32)], 1, shift=4); m ^= t
    return m
# the grade (post.js) without halation / grain: pre-grade v -> screen at pixel (x, y) (t ~ 36 s, flicker ~ 1)
def vign(x, y):
    qx = (x / 2206 - 0.5) * 2; qy = (y / 946 - 0.5) * 2; r = np.clip((qx * qx + qy * qy) / 2, 0, 1); return 1 - 0.38 * r ** 1.15
def scurve(f): return f * 0.65 + 0.35 * f * f * (3 - 2 * f)
_lut = np.linspace(0, 1, 4097); _sc = scurve(_lut)
def inv_scurve(s): return np.interp(s, _sc, _lut)
def pre(screen, x, y):   # approximate inverse grade (no halation): screen 0..255 -> pre-grade 0..1
    return inv_scurve(np.clip(np.asarray(screen, np.float64) / 255 / vign(np.asarray(x, np.float64), np.asarray(y, np.float64)), 0, 1))
# ---- the full grade (post.js) without grain, and its inverse (fixed-point on the halation), for measuring pre-grade
def flick(t): return 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1.0)
_YY, _XX = np.mgrid[0:946, 0:2206].astype(np.float32)
_VIG = vign(_XX + 0.5, _YY + 0.5).astype(np.float32)
def halation(P, halo=0.42):
    q = cv2.resize(P.astype(np.float32), (552, 237), interpolation=cv2.INTER_AREA)
    hl = np.clip((q - 120 / 255) / (135 / 255), 0, 1) * q
    b5 = cv2.GaussianBlur(hl, (0, 0), 5); b16 = cv2.GaussianBlur(hl, (0, 0), 16)
    hb = cv2.resize(0.6 * b5 + 0.4 * b16, (2206, 946), interpolation=cv2.INTER_LINEAR)
    return halo * hb
def grade(P, t=35.8, halo=0.42):
    f = 1 - (1 - P) * (1 - halation(P, halo)); f = scurve(f) * _VIG * flick(t); return np.clip(f, 0, 1) * 255
def ungrade(S, t=35.8, halo=0.42, it=5):
    f = inv_scurve(np.clip(S / 255 / (_VIG * flick(t)), 0, 1)).astype(np.float32); P = f.copy()
    for _ in range(it):
        H = halation(P, halo); P = np.clip(1 - (1 - f) / np.maximum(1e-3, 1 - H), 0, 1).astype(np.float32)
    return P
def srcpre(f, t=None):
    if t is None:
        a = int(str(f).split('-')[0]); b = int(str(f).split('-')[-1]); t = (a + b) / 2 / 25 + 0.02
    return ungrade(src(f), t)
