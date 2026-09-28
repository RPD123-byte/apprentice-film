import cv2, glob, re, sys, numpy as np
d = sys.argv[1]
fr = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
print(f"{'t':>8} {'s8':>6} {'s2':>6} {'mR':>6} {'mS':>6} {'scrR':>6} {'scrS':>6} {'outR':>6} {'outS':>6} {'owlR':>6} {'owlS':>6}")
for p in fr:
    t = re.search(r'at-([\d.]+)s', p).group(1)
    q = p.replace('frame-', 'ref-')
    if not glob.glob(q):
        cands = glob.glob(d + f'/ref-*at-{t}s*')
        if not cands: print(t, 'no ref'); continue
        q = cands[0]
    a = cv2.imread(p, 0).astype(np.float32); b = cv2.imread(q, 0).astype(np.float32)
    if a.shape != b.shape: b = cv2.resize(b, (a.shape[1], a.shape[0]))
    s8 = np.abs(cv2.GaussianBlur(a, (0, 0), 8) - cv2.GaussianBlur(b, (0, 0), 8)).mean()
    s2 = np.abs(cv2.GaussianBlur(a, (0, 0), 2) - cv2.GaussianBlur(b, (0, 0), 2)).mean()
    # screen region approx (x 140..2060, y 100..900)
    scr = (slice(110, 900), slice(150, 2050))
    m = np.ones_like(a, bool); m[scr] = False
    owl = (slice(250, 900), slice(850, 1400))
    print(f"{float(t):8.2f} {s8:6.1f} {s2:6.1f} {a.mean():6.1f} {b.mean():6.1f} {a[scr].mean():6.1f} {b[scr].mean():6.1f} {a[m].mean():6.1f} {b[m].mean():6.1f} {a[owl].mean():6.1f} {b[owl].mean():6.1f}")
