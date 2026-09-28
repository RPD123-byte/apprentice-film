# Draw the shot's lid quad (s27.js lidCorners logic) over source frames, to check the edge-on pass.
# usage: lidquad.py k1,k2,... OUT.jpg [crop x0,y0,x1,y1]
import cv2, numpy as np, sys, json, subprocess
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
ks = [int(x) for x in sys.argv[1].split(',')]; out = sys.argv[2]
RD = sys.argv[4] if len(sys.argv) > 4 else None
crop = [int(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 else [1300, 0, 2206, 946]
D = json.loads(subprocess.check_output(['node', '-e', "Promise.all([import('/Users/computer/rootline/apprentice-film/src/shots/s27/data.js'),import('/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js')]).then(([a,b])=>console.log(JSON.stringify({S:a.SCREEN,L:b.LID_END})))"]))
LID = (-93, -234, 2268, 1170)
def cr(T, t):
    n = len(T)
    if t <= T[0][0]: return T[0][1:]
    if t >= T[-1][0]: return T[-1][1:]
    i = 1
    while i < n - 1 and T[i][0] < t: i += 1
    p0, p1, p2, p3 = T[max(0, i - 2)], T[i - 1], T[i], T[min(n - 1, i + 1)]
    u = (t - p1[0]) / (p2[0] - p1[0]); u2 = u * u; u3 = u2 * u
    return [0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3) for k in range(1, len(p1))]
def corners(t):
    R = [(LID[0], LID[1]), (LID[2], LID[1]), (LID[2], LID[3]), (LID[0], LID[3])]
    if t <= 128.44:
        H = np.array(cr(D['S'], max(118, t))).reshape(3, 3)
        return [tuple((H @ [x, y, 1])[:2] / (H @ [x, y, 1])[2]) for x, y in R]
    if t >= 128.8:
        c = cr(D['L'], t); return [(c[0], c[1]), (c[2], c[3]), (c[4], c[5]), (c[6], c[7])]
    a, b, u = corners(128.44), corners(128.8), (t - 128.44) / 0.36
    return [(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u) for p, q in zip(a, b)]
tiles = []
for k in ks:
    t = k / 25; im = cv2.imread(f'{REF}/src/{k:05d}.png' if not RD else f'{RD}/frame-{k:05d}.png')
    C = corners(t)
    cv2.polylines(im, [np.int32(C)], True, (0, 255, 255), 2)
    for i, p in enumerate(C): cv2.putText(im, str(i), (int(p[0]) + 4, int(p[1]) + 4), 0, 0.8, (0, 0, 255), 2)
    for x in range(0, 2206, 100): cv2.line(im, (x, 0), (x, 946), (255, 128, 0), 1)
    for y in range(0, 946, 100): cv2.line(im, (0, y), (2206, y), (255, 128, 0), 1)
    x0, y0, x1, y1 = crop; c = im[y0:y1, x0:x1]
    cv2.putText(c, '%.2f' % t, (10, 30), 0, 1, (0, 255, 0), 2)
    print('%.2f' % t, ' '.join('(%d,%d)' % p for p in C))
    tiles.append(c)
cols = 4
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
rows = [np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
img = np.vstack(rows); s = 2000 / img.shape[1]
cv2.imwrite(out, cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA))
