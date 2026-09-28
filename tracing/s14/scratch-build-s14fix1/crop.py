#!/usr/bin/env python3
# crop.py DIR IDX x0 y0 x1 y1 out.jpg [scale] [--grid]  -> render (top) over ref (bottom), same crop
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv) > 8 and not sys.argv[8].startswith('--') else 1.0
grid = '--grid' in sys.argv
fr = cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]); rf = cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0])
def g(im):
    im = im.copy()
    if grid:
        for x in range((x0//50)*50, x1, 50):
            cv2.line(im,(x,y0),(x,y1),(0,160,255) if x%100 else (0,0,255),1); cv2.putText(im,str(x),(x+2,y0+12),0,0.4,(0,255,255),1)
        for y in range((y0//50)*50, y1, 50):
            cv2.line(im,(x0,y),(x1,y),(0,160,255) if y%100 else (0,0,255),1); cv2.putText(im,str(y),(x0+2,y-2),0,0.4,(0,255,255),1)
    c = im[y0:y1, x0:x1]
    return cv2.resize(c, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
a, b = g(fr), g(rf)
horiz = '--h' in sys.argv
cv2.imwrite(out, np.hstack([a,b]) if horiz else np.vstack([a, b]), [cv2.IMWRITE_JPEG_QUALITY, 88])
