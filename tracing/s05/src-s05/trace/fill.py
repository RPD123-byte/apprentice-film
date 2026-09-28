# Smooth fills for unknown pixels (measurement pipeline helpers).
import numpy as np, cv2

def pushpull(val, known, levels=10):
    """fill unknown pixels of val (HxW float) from known ones by a push-pull pyramid (smooth, fast)."""
    v = np.where(known, val, 0).astype(np.float32); w = known.astype(np.float32)
    pyr = [(v, w)]
    for _ in range(levels):
        v, w = pyr[-1]
        if min(v.shape) < 4: break
        v2 = cv2.resize(v, ((v.shape[1] + 1) // 2, (v.shape[0] + 1) // 2), interpolation=cv2.INTER_AREA)
        w2 = cv2.resize(w, ((w.shape[1] + 1) // 2, (w.shape[0] + 1) // 2), interpolation=cv2.INTER_AREA)
        pyr.append((v2, w2))
    v, w = pyr[-1]; est = np.where(w > 1e-6, v / np.maximum(w, 1e-6), (v.sum() / max(w.sum(), 1e-6)))
    for v, w in reversed(pyr[:-1]):
        up = cv2.resize(est, (v.shape[1], v.shape[0]), interpolation=cv2.INTER_LINEAR)
        a = np.clip(w, 0, 1)
        est = np.where(w > 1e-6, (v / np.maximum(w, 1e-6)) * a + up * (1 - a), up)
    return np.where(known, val, est).astype(np.float32)

def smooth_in(val, region, sigma):
    """gaussian smoothing restricted to region (normalized convolution)."""
    r = region.astype(np.float32)
    num = cv2.GaussianBlur(val * r, (0, 0), sigma); den = cv2.GaussianBlur(r, (0, 0), sigma)
    return np.where(region, num / np.maximum(den, 1e-4), val).astype(np.float32)
