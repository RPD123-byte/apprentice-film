import cv2, numpy as np, sys
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
P = np.array([[1652,158],[1700,160],[1750,158],[1800,152],[1830,143],[1850,133],[1872,120],[1890,106],[1886,180],[1872,229],[1850,250],[1830,264],[1800,277],[1750,287],[1700,293],[1652,291]], np.int32)
M = np.zeros((946,2206), np.uint8); cv2.fillPoly(M, [P], 1); M = M > 0
for d in sys.argv[1:]:
    out = {1: [], 2: [], 8: []}; sd = []
    for n in (727, 740, 755):
        a = cv2.cvtColor(cv2.imread(f'{d}/r{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32); b = cv2.cvtColor(cv2.imread(f'{S}/n{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
        for s in out: out[s].append(np.abs(cv2.GaussianBlur(a,(0,0),s) - cv2.GaussianBlur(b,(0,0),s))[M].mean())
        sd.append((a[M].std(), b[M].std()))
    print(d, ' '.join('s%d %.2f' % (s, np.mean(v)) for s, v in out.items()), 'std r/s %.1f/%.1f' % tuple(np.mean(sd, 0)))
