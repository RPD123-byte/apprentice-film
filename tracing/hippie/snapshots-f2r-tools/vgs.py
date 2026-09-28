import sys, cv2, numpy as np
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/strip-pre.png')
x, y0, y1, st = [int(v) for v in sys.argv[1:5]]
u = x + 440
for y in range(y0, y1 + 1, st):
    v = y - 60
    w = im[v - 1:v + 2, u - 2:u + 3].reshape(-1, 3); b, g, r = np.median(w, axis=0).astype(int)
    print(f"{y}:#{r:02x}{g:02x}{b:02x}", end='  ')
print()
