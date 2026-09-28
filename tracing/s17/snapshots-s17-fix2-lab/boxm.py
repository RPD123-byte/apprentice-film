# boxm.py dir t name:x0,y0,x1,y1 ... : per-box stats render vs source (graded): mean, p50, p90, sigma2/sigma6 MAE, Laplacian ratio
import sys,cv2,numpy as np
d=sys.argv[1]; t=float(sys.argv[2])
R=cv2.cvtColor(cv2.imread(f'{d}/r{t:.2f}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32); S=cv2.cvtColor(cv2.imread(f'{d}/s{t:.2f}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
def m(a,b,s): return float(np.abs(cv2.GaussianBlur(a,(0,0),s)-cv2.GaussianBlur(b,(0,0),s)).mean())
for arg in sys.argv[3:]:
    n,bx=arg.split(':'); x0,y0,x1,y1=map(int,bx.split(','))
    a=R[y0:y1,x0:x1]; b=S[y0:y1,x0:x1]
    la=np.abs(cv2.Laplacian(cv2.GaussianBlur(a,(0,0),0.7),cv2.CV_32F)).mean(); lb=np.abs(cv2.Laplacian(cv2.GaussianBlur(b,(0,0),0.7),cv2.CV_32F)).mean()
    print(f'{n:10s} mean {a.mean():6.1f}/{b.mean():6.1f} p50 {np.percentile(a,50):4.0f}/{np.percentile(b,50):4.0f} p90 {np.percentile(a,90):4.0f}/{np.percentile(b,90):4.0f} s2 {m(a,b,2):5.1f} s6 {m(a,b,6):5.1f} lap {la/lb:4.2f}')
