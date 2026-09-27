import cv2, numpy as np, glob, re, sys
d = sys.argv[1]
fr = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
g = lambda p: cv2.imread(p, 0).astype(np.float32)
regs = {'beanie': (20, 20, 440, 540), 'hairL': (120, 600, 560, 946), 'slab': (640, 740, 900, 940)}
R0 = g(fr[0]); S0 = g(fr[0].replace('frame-', 'ref-'))
win = {k: cv2.createHanningWindow((x1 - x0, y1 - y0), cv2.CV_32F) for k, (x0, y0, x1, y1) in regs.items()}
def lc(a):
    m = cv2.GaussianBlur(a, (0, 0), 3); return np.sqrt(np.maximum(cv2.GaussianBlur(a * a, (0, 0), 3) - m * m, 0)).mean()
print('t      ' + '  '.join(f'{k:>22s}' for k in regs) + '   cuffLC r/s    crownHF r/s')
for f in fr:
    t = re.search(r'at-([\d.]+)s', f).group(1)
    A = g(f); B = g(f.replace('frame-', 'ref-'))
    row = []
    for k, (x0, y0, x1, y1) in regs.items():
        (dxr, dyr), _ = cv2.phaseCorrelate(R0[y0:y1, x0:x1], A[y0:y1, x0:x1], win[k])
        (dxs, dys), _ = cv2.phaseCorrelate(S0[y0:y1, x0:x1], B[y0:y1, x0:x1], win[k])
        row.append(f'{dxr:5.2f},{dyr:5.2f}|{dxs:5.2f},{dys:5.2f}')
    c = (20, 300, 150, 520); a, b = A[c[1]:c[3], c[0]:c[2]], B[c[1]:c[3], c[0]:c[2]]
    cr = (20, 20, 200, 240); a2, b2 = A[cr[1]:cr[3], cr[0]:cr[2]], B[cr[1]:cr[3], cr[0]:cr[2]]
    hf = lambda z: np.abs(z - cv2.GaussianBlur(z, (0, 0), 2)).mean()
    print(f'{t:7s}' + '  '.join(f'{s:>22s}' for s in row) + f'   {lc(a):5.1f}/{lc(b):5.1f}   {hf(a2):5.1f}/{hf(b2):5.1f}')
