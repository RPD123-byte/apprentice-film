# shared measurement helpers for s18/trace2 (source frames, grade inverse, the shot-B tip transforms, keyboard mask)
import numpy as np, cv2, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from grade import inverse, forward
REF = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
SRC = os.environ.get('S18SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18rev1n/src/')
_cap = None
def frame(n, gray=True):
    p = f'{SRC}f{n:04d}.png'
    if os.path.exists(p):
        f = cv2.imread(p)
    else:
        global _cap
        if _cap is None: _cap = cv2.VideoCapture(REF)
        _cap.set(cv2.CAP_PROP_POS_FRAMES, n); ok, f = _cap.read()
    return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) if gray else f
def pre(n):
    """source frame n with the film's grade undone (pre-grade value 0..1)"""
    return inverse(frame(n).astype(np.float32) / 255, n / 25).astype(np.float32)
# plate -> frame affine per frame (canvas order a, b, c, d, e, f: x' = a x + c y + e, y' = b x + d y + f), = s18.js TIP
TIP = {
  1418: (1.00071, -0.00518, 0.00335, 1.00092, -5.4, 10.5), 1419: (0.99930, -0.03374, 0.03348, 1.00222, -30.6, 64.3),
  1420: (0.99300, -0.10380, 0.10069, 1.00538, -78.2, 188.7), 1421: (0.98333, -0.18421, 0.17839, 0.99500, -134.5, 348.1),
  1422: (0.97014, -0.24795, 0.23905, 0.98771, -175.3, 482.4), 1423: (0.96141, -0.30091, 0.29193, 0.97217, -216.0, 608.5),
  1424: (0.94779, -0.34926, 0.33579, 0.96504, -241.6, 708.5), 1425: (0.93840, -0.37413, 0.36123, 0.95829, -257.7, 760.5),
  1426: (0.93835, -0.37412, 0.36120, 0.95825, -257.6, 760.5), 1427: (0.93362, -0.38641, 0.37317, 0.95308, -268.9, 789.7),
  1428: (0.92772, -0.40537, 0.39161, 0.94400, -286.0, 846.9), 1429: (0.91266, -0.44801, 0.43164, 0.93181, -310.1, 961.5),
  1430: (0.88795, -0.50050, 0.48626, 0.90568, -338.0, 1112.5), 1431: (0.86042, -0.55878, 0.54459, 0.87701, -378.7, 1303.4),
  1432: (0.82146, -0.59924, 0.59924, 0.82146, -405.8, 1520.0)}
M = 260; KBW = M + 3000; KBH = 946 + 260
def tip3(n):
    if n not in TIP: return np.eye(3)
    a, b, c, d, e, f = TIP[n]
    return np.array([[a, c, e], [b, d, f], [0, 0, 1]], np.float64)
SH = np.array([[1, 0, -M], [0, 1, 0], [0, 0, 1]], np.float64)   # canvas -> plate
def kb_to_frame(img, n, interp=cv2.INTER_LINEAR, border=0):
    T = (tip3(n) @ SH)[:2].astype(np.float32)
    return cv2.warpAffine(img.astype(np.float32), T, (2206, 946), flags=interp, borderValue=border)
def frame_to_kb(img, n, interp=cv2.INTER_LINEAR, border=-1):
    T = (tip3(n) @ SH)[:2].astype(np.float32)
    return cv2.warpAffine(img.astype(np.float32), T, (KBW, KBH), flags=interp | cv2.WARP_INVERSE_MAP, borderValue=border)
