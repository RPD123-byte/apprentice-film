# colour-class helper for scan measurements (pre-grade image)
import cv2, numpy as np
CODES = {'.': 'dark', 'C': 'cream', 'Y': 'yellow/gold', 'O': 'orange', 'P': 'pink/magenta', 'V': 'purple/indigo', 'G': 'green', 'B': 'blue', 'W': 'white', '?': 'other'}
def classify(bgr):
    b, g, r = [int(v) for v in bgr]
    hsv = cv2.cvtColor(np.uint8([[[b, g, r]]]), cv2.COLOR_BGR2HSV)[0, 0]
    h, s, v = int(hsv[0]) * 2, int(hsv[1]), int(hsv[2])
    if v < 70: return '.'
    if s < 60 and v > 170: return 'C'
    if s < 50: return '?'
    if 30 <= h < 62: return 'Y'
    if 5 <= h < 30 or (h < 5 and s > 120 and g > 45): return 'O'
    if h >= 300 or h < 5: return 'P'
    if 230 <= h < 300: return 'V'
    if 62 <= h < 170: return 'G'
    if 170 <= h < 230: return 'B'
    return '?'
def profile(im, p0, p1, n=None):
    p0 = np.array(p0, float); p1 = np.array(p1, float)
    L = np.linalg.norm(p1 - p0); n = n or int(L)
    s = ''
    for k in range(n):
        q = p0 + (p1 - p0) * k / max(1, n - 1)
        s += classify(im[int(round(q[1])), int(round(q[0]))])
    return s
def runs(s):
    out = []; i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]: j += 1
        out.append((s[i], i, j - i)); i = j
    return out
