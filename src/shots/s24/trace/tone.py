# Tone trace: a drawing (pre-grade luminance field, 0..255) inside a mask -> stacked iso-value contours.
# Level i region = {field >= T_i}; the film fills level 0 with value c_0, then each higher level on top with c_i
# (c_i = mean of the field between T_i and T_{i+1}). Contours are sub-pixel marching-squares iso-lines of the
# lightly smoothed field, RDP-simplified. Measurement only: the output is vector geometry and grey values.
import numpy as np, cv2
from skimage import measure

def rdp(pts, eps):
    # iterative Ramer-Douglas-Peucker on an (n,2) closed polyline
    n = len(pts)
    if n < 4: return pts
    keep = np.zeros(n, bool); keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1: continue
        p, q = pts[a], pts[b]
        d = q - p; L = np.hypot(*d)
        seg = pts[a + 1:b]
        if L < 1e-9: dist = np.hypot(*(seg - p).T)
        else: dist = np.abs(d[0] * (seg[:, 1] - p[1]) - d[1] * (seg[:, 0] - p[0])) / L
        i = int(np.argmax(dist))
        if dist[i] > eps:
            m = a + 1 + i; keep[m] = True; stack.append((a, m)); stack.append((m, b))
    return pts[keep]

def poly_area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))

def trace(field, mask, levels, sigma=0.7, eps=0.4, min_area=2.0, offset=(0, 0), sigma_hi=None, base=True):
    """field: float32 HxW (0..255). mask: uint8 HxW (1 = drawing). levels: thresholds (ascending).
    returns list of {t, v, paths} with paths as (n,2) float arrays in frame coords (+offset).
    base: the first level is the mask itself (an opaque dark silhouette holding the keylines)."""
    F = np.nan_to_num(field, nan=0).astype(np.float32)
    F = np.where(mask > 0, F, 0).astype(np.float32)
    Fs = cv2.GaussianBlur(F, (0, 0), sigma) if sigma > 0 else F
    Fp = np.pad(Fs, 2, constant_values=-1)
    out = []
    raw = np.where(mask > 0, F, np.nan)
    if base:
        ms = np.pad(cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.0), 2, constant_values=0)
        dark = (mask > 0) & (F < levels[0])
        v = float(np.mean(F[dark])) if dark.sum() > 10 else levels[0] / 2
        paths = []
        for c in measure.find_contours(ms, 0.5):
            p = c[:, ::-1] - 2
            if poly_area(p) < min_area: continue
            if np.hypot(*(p[0] - p[-1])) < 1e-6: p = p[:-1]
            q = rdp(np.vstack([p, p[:1]]), eps)[:-1]
            if len(q) >= 3: paths.append(q + np.array(offset, np.float32))
        out.append({'t': -1.0, 'v': v, 'paths': paths})
    for i, T in enumerate(levels):
        hi = levels[i + 1] if i + 1 < len(levels) else 256
        band = (raw >= T) & (raw < hi)
        v = float(np.nanmean(raw[band])) if band.sum() > 20 else (T + min(hi, 255)) / 2
        src = Fp
        if sigma_hi and T >= sigma_hi[0]:
            src = np.pad(cv2.GaussianBlur(F, (0, 0), sigma_hi[1]), 2, constant_values=-1)
        cs = measure.find_contours(src, T)
        paths = []
        for c in cs:
            p = c[:, ::-1] - 2  # (x, y)
            if poly_area(p) < min_area: continue
            if np.hypot(*(p[0] - p[-1])) < 1e-6: p = p[:-1]
            q = rdp(np.vstack([p, p[:1]]), eps)[:-1]
            if len(q) < 3: continue
            paths.append(q + np.array(offset, np.float32))
        out.append({'t': float(T), 'v': v, 'paths': paths})
    return out

def raster(levels_out, shape, offset=(0, 0), ss=4):
    """preview: stacked even-odd fills at ss x supersampling -> float32 image"""
    H, W = shape
    img = np.zeros((H * ss, W * ss), np.float32)
    for L in levels_out:
        m = np.zeros((H * ss, W * ss), np.uint8)
        for p in L['paths']:
            q = np.int32(np.round((p - np.array(offset)) * ss + (ss - 1) / 2))
            t = np.zeros_like(m); cv2.fillPoly(t, [q], 1); m ^= t
        img[m > 0] = L['v']
    return cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)

def npts(levels_out): return sum(len(p) for L in levels_out for p in L['paths'])

# compact encoding: coordinates in 1/4 px, per path: absolute start then deltas; zigzag varint in base 64 chars
ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
def _enc_int(n, out):
    z = (n << 1) if n >= 0 else ((-n) << 1) - 1
    while True:
        d = z & 31; z >>= 5
        if z: out.append(ALPH[32 + d])
        else: out.append(ALPH[d]); break
def encode_path(p, q=4):
    a = np.round(np.asarray(p) * q).astype(np.int64)
    out = []
    _enc_int(int(a[0, 0]), out); _enc_int(int(a[0, 1]), out)
    d = np.diff(a, axis=0)
    for dx, dy in d: _enc_int(int(dx), out); _enc_int(int(dy), out)
    return ''.join(out)
