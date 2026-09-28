import cv2, glob, os, sys
for d in sys.argv[1:]:
    for p in sorted(glob.glob(d + '/*.png')):
        q = p[:-4] + '.webp'
        im = cv2.imread(p)
        if im is None: continue
        if cv2.imwrite(q, im, [cv2.IMWRITE_WEBP_QUALITY, 101]) and os.path.getsize(q) > 1000: os.remove(p)
