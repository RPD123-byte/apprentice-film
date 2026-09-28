# Nearest-palette classification along scan lines (pre-grade image). Usage: prof2.py PAL x0,y0,x1,y1 ...
# PAL: name of a palette below. Prints runs "<class><start>+<len>" (start = distance along the line).
import sys, cv2, numpy as np
PALS = {
 'rib': {'C': (238, 211, 184), 'Y': (226, 171, 90), 'O': (220, 91, 80), 'P': (213, 31, 149), 'V': (83, 58, 144), '.': (36, 35, 49), '_': (25, 18, 22), 'k': (240, 150, 190)},
}
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-pre.png').astype(np.float32)
lab = cv2.cvtColor(im / 255, cv2.COLOR_BGR2Lab)
def tolab(rgb): return cv2.cvtColor(np.float32([[[rgb[2] / 255, rgb[1] / 255, rgb[0] / 255]]]), cv2.COLOR_BGR2Lab)[0, 0]
pal = PALS[sys.argv[1]]; keys = list(pal); P = np.array([tolab(pal[k]) for k in keys])
for a in sys.argv[2:]:
    x0, y0, x1, y1 = [float(v) for v in a.split(',')]
    n = int(np.hypot(x1 - x0, y1 - y0)) + 1
    s = ''
    for k in range(n):
        x = x0 + (x1 - x0) * k / (n - 1); y = y0 + (y1 - y0) * k / (n - 1)
        v = lab[int(round(y)), int(round(x))]
        s += keys[int(np.argmin(((P - v) ** 2).sum(1)))]
    out = []; i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]: j += 1
        if j - i >= 2: out.append(f"{s[i]}{i}+{j-i}")
        i = j
    print(a, ' '.join(out))
