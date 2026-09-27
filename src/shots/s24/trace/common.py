# shared helpers for the s24 measurement scripts (not loaded by the film)
import cv2, numpy as np, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ungrade import ungrade
# measurement data (source-derived plates, masks, per-frame traces) lives OUTSIDE the project, in WORK; every
# script runs there (relative paths resolve into WORK)
WORK = os.environ.get('S24WORK', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/work')
SHOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # src/shots/s24
os.makedirs(WORK, exist_ok=True); os.chdir(WORK)
SRC = os.environ.get('S24SRC', '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/src')
def tk(k): return 96.8 + 0.04 * k
def frame(k): return cv2.imread(f'{SRC}/k{k:02d}.png')
_U = {}
def U(k, halation=True):
    """pre-grade luminance (0..255 float32) of source frame k"""
    key = (k, halation)
    if key not in _U:
        fn = f'{SRC}/U{k:02d}{"" if halation else "n"}.npy'
        if os.path.exists(fn): _U[key] = np.load(fn)
        else:
            u = ungrade(frame(k), tk(k), halation)
            _U[key] = (cv2.cvtColor(u, cv2.COLOR_BGR2GRAY) * 255).astype(np.float32)
            np.save(fn, _U[key])
    return _U[key]
