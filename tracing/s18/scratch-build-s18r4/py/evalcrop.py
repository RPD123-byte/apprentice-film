# evalcrop.py P_full.npy drawing.pkl x0 y0 x1 y1 out.jpg [wk] : preview the drawing (frame coords) vs the plate in a crop, graded
import sys, pickle, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s18/trace2')
from inktrace import render_preview
from grade import forward
P = np.load(sys.argv[1]).astype(np.float32); D = pickle.load(open(sys.argv[2], 'rb'))
x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]; wk = float(sys.argv[8]) if len(sys.argv) > 8 else 0.92
D['shape'] = P.shape
R = render_preview(D, P.shape, soft=0.6, wk=(wk, 1))
Rf = P.copy(); Rf[y0:y1, x0:x1] = R[y0:y1, x0:x1]
g = lambda a: forward(np.clip(a, 0, 1)) * 255
Rg, Sg = g(Rf)[y0:y1, x0:x1], g(P)[y0:y1, x0:x1]
e = lambda s: np.abs(cv2.GaussianBlur(Rg, (0, 0), s) - cv2.GaussianBlur(Sg, (0, 0), s)).mean()
print(f'b1 {e(1):.2f} b2 {e(2):.2f} b6 {e(6):.2f} mean {Rg.mean():.1f}/{Sg.mean():.1f}')
im = np.vstack([Rg, np.full((4, Rg.shape[1]), 255), Sg]).astype(np.uint8)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
