import cv2,numpy as np,sys
D='snapshots/s07-rev2-h/'
run=sys.argv[1] if len(sys.argv)>1 else 'run1'
def L(p): return cv2.imread(p,0).astype(np.float32)
for k in range(720,769):
    a=L(D+run+'/f-%.2f.png'%(k/25)); b=L(D+'src/s%04d.png'%k)
    m8=np.abs(cv2.GaussianBlur(a,(0,0),8)-cv2.GaussianBlur(b,(0,0),8)).mean()
    m2=np.abs(cv2.GaussianBlur(a,(0,0),2)-cv2.GaussianBlur(b,(0,0),2)).mean()
    print(k,'%.2f'%(k/25),'mean %.1f/%.1f'%(a.mean(),b.mean()),'s8 %.2f s2 %.2f'%(m8,m2))
