import cv2, numpy as np, sys
fr = np.load('../s22/frames.npy', mmap_mode='r')
rd = sys.argv[1]
for F in map(int, sys.argv[2].split(',')):
    a = __import__('rmap').rimg(F).astype(np.float32).mean(axis=2); b = np.array(fr[F - 1863]).astype(np.float32).mean(axis=2)
    pg = (slice(380, 940), slice(150, 2020)); lm = (slice(150, 900), slice(0, 120))
    s = 'F %d t %.2f page S/R %.3f (R %.1f S %.1f) leftm S/R %.3f' % (F, F / 25, b[pg].mean() / a[pg].mean(), a[pg].mean(), b[pg].mean(), b[lm].mean() / a[lm].mean())
    # top margin bins y 5-40 / 50-110, x 1000-1400
    t1 = (slice(5, 40), slice(1000, 1400)); t2 = (slice(50, 110), slice(1000, 1400)); tm = (slice(0, 120), slice(0, 2206))
    s += ' | top y5-40 R %.1f S %.1f | y50-110 R %.1f S %.1f | topmargin mean R-S %+.1f' % (a[t1].mean(), b[t1].mean(), a[t2].mean(), b[t2].mean(), a[tm].mean() - b[tm].mean())
    print(s)
