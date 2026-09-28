#!/usr/bin/env python3
# onion.py DIR IDX x0 y0 x1 y1 out.jpg [scale]: render in red, source in cyan (grey where they agree), 10px ticks
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv) > 8 else 2.0
fr = cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0],0)[y0:y1,x0:x1]; rf = cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0],0)[y0:y1,x0:x1]
im = np.dstack([rf, rf, fr])  # B,G = source ; R = render
im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
for x in range((x0//10+1)*10, x1, 10):
    X=int((x-x0)*sc); cv2.line(im,(X,0),(X,6 if x%50 else 16),(0,255,255),1)
    if x%50==0: cv2.putText(im,str(x),(X+2,28),0,0.45,(0,255,255),1)
for y in range((y0//10+1)*10, y1, 10):
    Y=int((y-y0)*sc); cv2.line(im,(0,Y),(6 if y%50 else 16,Y),(0,255,255),1)
    if y%50==0: cv2.putText(im,str(y),(18,Y+5),0,0.45,(0,255,255),1)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
