# Fit a low-frequency colour gain for the laptop base's top face per key time: source / render on a 4x3 grid of
# base-cm cells (median per channel over the cell's pixels), clipped to [0.6, 1.35]. Writes s27/deckgain.js.
# usage: deckgain.py RENDERDIR k1,k2,...
import cv2, numpy as np, sys, json, subprocess
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
rd = sys.argv[1]; ks = [int(x) for x in sys.argv[2].split(',')]
B = json.loads(subprocess.check_output(['node', '-e', "import('/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js').then(m=>console.log(JSON.stringify(m.BASE_ALL)))"]))
def cr(T, t):
    n = len(T)
    if t <= T[0][0]: return T[0][1:]
    if t >= T[-1][0]: return T[-1][1:]
    i = 1
    while i < n - 1 and T[i][0] < t: i += 1
    p0, p1, p2, p3 = T[max(0, i - 2)], T[i - 1], T[i], T[min(n - 1, i + 1)]
    u = (t - p1[0]) / (p2[0] - p1[0]); u2 = u * u; u3 = u2 * u
    return [0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3) for k in range(1, 9)]
BW, BD, NX, NZ = 32.4, 22.5, 4, 3
rows = []
for k in ks:
    t = k / 25; c = cr(B, max(119.6, t))
    H = cv2.getPerspectiveTransform(np.float32([[-BW / 2, BD], [BW / 2, BD], [BW / 2, 0], [-BW / 2, 0]]), np.float32([[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]))
    S = cv2.GaussianBlur(cv2.imread(f'{REF}/src/{k:05d}.png'), (0, 0), 3).astype(float) + 1
    R = cv2.GaussianBlur(cv2.imread(f'{rd}/frame-{k:05d}.png'), (0, 0), 3).astype(float) + 1
    g = np.ones((NZ, NX, 3)); ok = np.zeros((NZ, NX), bool)
    # deck-only mask in cm (no keyboard well, no trackpad, 0.4 cm in from the outline), rasterised in frame px
    Hi = np.linalg.inv(H)
    ys, xs = np.mgrid[0:S.shape[0], 0:S.shape[1]]
    pts = np.stack([xs.ravel(), ys.ravel(), np.ones(xs.size)]).astype(np.float64)
    q = Hi @ pts; cx = (q[0] / q[2]).reshape(S.shape[:2]); cz = (q[1] / q[2]).reshape(S.shape[:2])
    deck = (cx > -BW / 2 + 0.5) & (cx < BW / 2 - 0.5) & (cz > 0.5) & (cz < BD - 0.5)
    deck &= ~((cx > -14.3) & (cx < 14.4) & (cz > 0.0) & (cz < 13.1))
    deck &= ~((cx > -5.6) & (cx < 5.8) & (cz > 13.4) & (cz < 21.3))
    LS, LR = S.mean(2), R.mean(2)
    lr = np.log(LS / LR)
    deck &= (np.abs(lr) < np.log(1.7)) & (LR > 90)
    for j in range(NZ):
        for i in range(NX):
            x0, x1 = -BW / 2 + BW * i / NX, -BW / 2 + BW * (i + 1) / NX
            z0, z1 = BD * j / NZ, BD * (j + 1) / NZ
            m = deck & (cx >= x0) & (cx < x1) & (cz >= z0) & (cz < z1)
            if m.sum() < 150: continue
            g[j, i] = np.clip((S[m].mean(0) / R[m].mean(0))[::-1], 0.6, 1.35); ok[j, i] = True
    # cells with too few deck pixels take the mean of the measured ones in their row, else of all
    for j in range(NZ):
        for i in range(NX):
            if not ok[j, i]:
                r = [g[j, ii] for ii in range(NX) if ok[j, ii]]
                a = [g[jj, ii] for jj in range(NZ) for ii in range(NX) if ok[jj, ii]]
                g[j, i] = np.mean(r, 0) if r else (np.mean(a, 0) if a else np.ones(3))
    rows.append((round(t, 2), g))
    print(t, ' | '.join(' '.join('%.2f' % v for v in g[j].mean(1)) for j in range(NZ)))
# temporal smoothing [1 2 1] / 4 (the per-frame fits carry a little noise from grain and small misalignments)
G = [g for _, g in rows]
rows = [(rows[i][0], G[i] if i in (0, len(G) - 1) else 0.25 * G[i - 1] + 0.5 * G[i] + 0.25 * G[i + 1]) for i in range(len(G))]
with open('/Users/computer/rootline/apprentice-film/src/shots/s27/deckgain.js', 'w') as f:
    f.write('// s27 laptop base: low-frequency colour gain of the top face, source / render (graded), on a 4 x 3 grid of base-cm cells\n')
    f.write('// (x left→right, z hinge→front), per key time. Measured by tools/trace-scripts/s27t-tools/deckgain.py; applied as a 2x multiply.\n')
    f.write('// DECK_GAIN: [t, [[r,g,b] x 4] x 3]\n')
    f.write('export const DECK_GAIN = [\n')
    for t, g in rows:
        f.write('  [%.2f, %s],\n' % (t, json.dumps([[[round(float(v), 3) for v in g[j, i]] for i in range(NX)] for j in range(NZ)])))
    f.write('];\n')
