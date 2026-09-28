# zgrid.py img x0 y0 x1 y1 zoom step out.jpg [img2]  -> zoomed crop with a labelled grid (frame px); img2 = side by side
import cv2, numpy as np, sys
x0, y0, x1, y1 = map(int, sys.argv[2:6]); z = float(sys.argv[6]); st = int(sys.argv[7])
def one(p):
  im = cv2.imread(p)[y0:y1, x0:x1]
  im = cv2.resize(im, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC)
  for x in range((x0 // st + 1) * st, x1, st):
    X = int((x - x0) * z); cv2.line(im, (X, 0), (X, im.shape[0]), (0, 160, 255) if x % (st * 5) else (0, 0, 255), 1)
    cv2.putText(im, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
  for y in range((y0 // st + 1) * st, y1, st):
    Y = int((y - y0) * z); cv2.line(im, (0, Y), (im.shape[1], Y), (0, 160, 255) if y % (st * 5) else (0, 0, 255), 1)
    cv2.putText(im, str(y), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
  return im
ims = [one(sys.argv[9])] if len(sys.argv) > 9 else []
ims.append(one(sys.argv[1]))
cv2.imwrite(sys.argv[8], np.hstack(ims) if len(ims) > 1 else ims[0], [cv2.IMWRITE_JPEG_QUALITY, 92])
