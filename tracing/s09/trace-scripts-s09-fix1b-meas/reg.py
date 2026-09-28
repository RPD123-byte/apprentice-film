# reg.py DIR T name:x0,y0,x1,y1 ...  -> stats per region render/source
import cv2, sys, numpy as np, glob
d, t = sys.argv[1], sys.argv[2]
f = [p for p in glob.glob(d + '/frame-*.png') if f'at-{t}s' in p][0]
A = cv2.imread(f, 0).astype(np.float32); B = cv2.imread(f.replace('frame-', 'ref-'), 0).astype(np.float32)
for arg in sys.argv[3:]:
    n, box = arg.split(':'); x0, y0, x1, y1 = map(int, box.split(','))
    a, b = A[y0:y1, x0:x1], B[y0:y1, x0:x1]
    hf = lambda z: np.abs(z - cv2.GaussianBlur(z, (0, 0), 2)).mean()
    print(f'{n:10s} mean {a.mean():6.1f}/{b.mean():6.1f}  p10 {np.percentile(a,10):5.0f}/{np.percentile(b,10):5.0f}  p50 {np.median(a):5.0f}/{np.median(b):5.0f}  p90 {np.percentile(a,90):5.0f}/{np.percentile(b,90):5.0f}  hf {hf(a):5.1f}/{hf(b):5.1f}')
