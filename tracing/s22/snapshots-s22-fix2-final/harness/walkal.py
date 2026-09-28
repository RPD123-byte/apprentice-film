# walkal.py: source walk frames warped into the walk drawing's anchor-local px (u -40..250, v -30..160), ×S
import json, cv2, numpy as np, sys
sys.path.insert(0, '.')
from run import src, gray
SP = __import__('os').path.dirname(__import__('os').path.abspath(__file__))   # boxes.json (from boxes.mjs) lives here
BX = json.load(open(f'{SP}/boxes.json'))
U0, V0, UW, VH = -40, -30, 290, 190
def aligned(I, F, S=4, u0=U0, v0=V0, uw=UW, vh=VH):
    a, b, c, d, e, f = BX[str(F)]['m']
    # local (u, v) -> frame (a u + c v + e, b u + d v + f); output pixel (X, Y) -> u = u0 + X/S
    M = np.array([[a / S, c / S, a * u0 + c * v0 + e], [b / S, d / S, b * u0 + d * v0 + f]], np.float64)
    # pixel-index convention: frame pixel i centre at i; output pixel X centre at u0 + X/S
    return cv2.warpAffine(I, M, (uw * S, vh * S), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP)
WALKF = [F for F in range(2043, 2099)]
