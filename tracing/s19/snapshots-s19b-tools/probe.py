# probe ungraded target values: probe.py which sigma "x,y x,y ..."  (which = lit|6308); or boxes "x0,y0,x1,y1"
import sys, numpy as np, cv2
w = sys.argv[1]; s = float(sys.argv[2])
A = np.load(f'../s19b-study/ungr_{w}.npy')
if s > 0: A = cv2.GaussianBlur(A, (0, 0), s)
for tok in sys.argv[3:]:
    v = [int(float(q)) for q in tok.split(',')]
    if len(v) == 2: print(tok, round(float(A[v[1], v[0]]), 3))
    else: x0, y0, x1, y1 = v; r = A[y0:y1, x0:x1]; print(tok, 'mean', round(float(r.mean()), 3), 'p10', round(float(np.percentile(r, 10)), 3), 'p90', round(float(np.percentile(r, 90)), 3))
