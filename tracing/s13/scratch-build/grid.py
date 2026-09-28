# usage: grid.py IMG_OR_fNNN x0 y0 x1 y1 zoom step out.png  -- zoomed crop with a labelled grid (frame coords)
import cv2, sys, numpy as np
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-rev1-p3-src'
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); z = float(sys.argv[6]); st = int(sys.argv[7]); dst = sys.argv[8]
im = cv2.imread(f'{SRC}/{src}.png' if src.startswith('f') and src[1:].isdigit() else src)[y0:y1, x0:x1]
im = cv2.resize(im, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st, x1, st):
    X = int((x-x0)*z); cv2.line(im, (X,0), (X,im.shape[0]), (0,0,255) if x % (st*5) == 0 else (0,160,255), 1)
    cv2.putText(im, str(x), (X+2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0,255,255), 1)
for y in range((y0//st+1)*st, y1, st):
    Y = int((y-y0)*z); cv2.line(im, (0,Y), (im.shape[1],Y), (0,0,255) if y % (st*5) == 0 else (0,160,255), 1)
    cv2.putText(im, str(y), (2, Y-2), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0,255,0), 1)
cv2.imwrite(dst, im)
