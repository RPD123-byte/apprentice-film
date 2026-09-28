# score.py DIR [DIR2...]: 8x-downsampled mean abs error (render vs ref) per frame, plus region errors
import cv2, glob, sys, re, numpy as np
for d in sys.argv[1:]:
    tot = []
    for f in sorted(glob.glob(d + '/frame-*.png')):
        t = re.search(r'at-([\d.]+)s', f).group(1)
        rf = f.replace('frame-', 'ref-')
        a = cv2.imread(f, 0).astype(float); b = cv2.imread(rf, 0).astype(float)
        A = cv2.resize(a, (a.shape[1] // 8, a.shape[0] // 8), interpolation=cv2.INTER_AREA); B = cv2.resize(b, A.shape[::-1], interpolation=cv2.INTER_AREA)
        e = np.abs(A - B).mean(); tot.append(e)
        print(d, t, '%.1f' % e, 'mean r/s %.1f/%.1f' % (a.mean(), b.mean()))
    print(d, 'AVG %.2f' % np.mean(tot))
