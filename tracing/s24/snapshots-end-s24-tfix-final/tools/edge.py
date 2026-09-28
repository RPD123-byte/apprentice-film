# edge.py RDIR k x0 y0 x1 y1 scale out.jpg -> source (grey) with the render's dark ink lines in red, source ink in cyan
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd, k = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); out = sys.argv[8]
r = cv2.imread(f"{rd}/k{k:02d}.png", 0)[y0:y1, x0:x1].astype(np.float32); s = cv2.imread(f"{SRC}/f{2420+k:04d}.png", 0)[y0:y1, x0:x1].astype(np.float32)
def ink(im):  # dark lines on light: local darkness vs a blurred background
    bg = cv2.dilate(im, np.ones((9, 9))); return np.clip((bg - im - 40) / 60, 0, 1)
ir, is_ = ink(r), ink(s)
base = 255 - (255 - np.minimum(s, 255)) * 0  # keep
g = np.full_like(s, 235)
img = np.dstack([g * (1 - is_) + 200 * is_, g * (1 - np.maximum(ir, is_)) + 60 * np.maximum(ir, is_) * 0 + 0, g * (1 - ir) + 230 * ir])
# cyan = source ink (B+G), red = render ink, dark = both
B = 235 - 235 * ir; G = 235 - 235 * np.maximum(ir, is_); R = 235 - 235 * is_
img = np.dstack([B, G, R])
img = cv2.resize(img, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out, np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
