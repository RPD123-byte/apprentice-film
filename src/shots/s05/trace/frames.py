# Source frames for s05 (measurement only): read, ungrade (undo src/lib/post.js), average static frames.
import numpy as np, cv2, os
from grade import ungrade
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
CACHE = os.environ.get('S05_CACHE', '/Users/computer/rootline/apprentice-film/snapshots/s05-p2-study/cache')
os.makedirs(CACHE, exist_ok=True)
TRACKS = os.environ.get('S05_TRACKS', os.path.join(os.path.dirname(CACHE), 'tracks'))
os.makedirs(TRACKS, exist_ok=True)

def frame(k):
    """source frame index k (t = k/25) as float32 BGR 0..1 (graded, as in the film)"""
    p = f'{CACHE}/f{k}.npy'
    if os.path.exists(p): return np.load(p)
    c = cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES, k); ok, f = c.read()
    f = f.astype(np.float32) / 255; np.save(p, f); return f

def pre(k):
    """ungraded (pre-grade) source frame k"""
    p = f'{CACHE}/u{k}.npy'
    if os.path.exists(p): return np.load(p)
    u = ungrade(frame(k), k / 25).astype(np.float32); np.save(p, u); return u

def static_target():
    """the settled frame: pre-grade average of 24.16-25.12 outside the right hand / forearm sweep (each frame scaled to
    the median exposure), and of 24.88-25.00 (the hand at rest) inside it."""
    p = f'{CACHE}/static.npy'
    if os.path.exists(p): return np.load(p)
    ks = list(range(604, 629))
    H, W = 946, 2206
    sweep = np.zeros((H, W), np.float32); sweep[560:830, 830:1610] = 1
    sweep = cv2.GaussianBlur(sweep, (0, 0), 6)
    ref = np.mean([pre(k) for k in (622, 623, 624, 625)], axis=0)
    m = np.ones((H, W), bool); m[140:680, 270:950] = False; m[540:840, 820:1620] = False
    acc = np.zeros((H, W, 3), np.float32)
    for k in ks:
        u = pre(k); g = ref[m].mean() / max(1e-4, u[m].mean()); acc += u * g
    acc /= len(ks)
    out = acc * (1 - sweep[..., None]) + ref * sweep[..., None]
    np.save(p, out.astype(np.float32)); return out

def poseB():
    """pose B of the right hand + forearm: pre-grade average of 25.48-26.68 without the owl's head dip (25.80-26.32)"""
    p = f'{CACHE}/poseB.npy'
    if os.path.exists(p): return np.load(p)
    ks = [k for k in range(637, 668) if not (645 <= k <= 658)]
    ref = np.mean([pre(k) for k in ks], axis=0).astype(np.float32)
    np.save(p, ref); return ref

def dip_target():
    """the owl's head at the bottom of its dip: pre-grade average of 26.00-26.08 (the head held there for 3 frames)"""
    p = f'{CACHE}/dip.npy'
    if os.path.exists(p): return np.load(p)
    ref = np.mean([pre(k) for k in (650, 651, 652)], axis=0).astype(np.float32)
    np.save(p, ref); return ref

# the head's pose at the bottom of the dip (s05.js DIP at 26.00): rotation about HEAD_C, then a shift, full above
# NECK[0], fading out to NECK[1]
DIP_PEAK = (-0.0644, -9.7, 5.5); HEAD_C = (1540, 330); NECK = (440, 520)
def dip_field(xx, yy, frac=1.0):
    th, dx, dy = DIP_PEAK[0] * frac, DIP_PEAK[1] * frac, DIP_PEAK[2] * frac
    u = np.clip((yy - NECK[0]) / (NECK[1] - NECK[0]), 0, 1); k = 1 - u * u * (3 - 2 * u)
    cs, sn = np.cos(th), np.sin(th); hx, hy = HEAD_C
    px = hx + dx + (xx - hx) * cs - (yy - hy) * sn; py = hy + dy + (xx - hx) * sn + (yy - hy) * cs
    return (px - xx) * k, (py - yy) * k
