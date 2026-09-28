import cv2,numpy as np,re,sys
# grad.py DIR [a-b] [y1] : Sobel-magnitude p99 inside the owl (source blurred>170 and eroded, y<y1) and on the keys
d=sys.argv[1]; a,b=map(int,(sys.argv[2] if len(sys.argv)>2 else '1382-1416').split('-')); y1=int(sys.argv[3]) if len(sys.argv)>3 else 230
def g(im):
    im=im.astype(np.float32); gx=cv2.Sobel(im,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(im,cv2.CV_32F,0,1,ksize=3); return np.hypot(gx,gy)
R=[];S=[]
for n in range(a,b+1):
    r=cv2.imread('%s/r%d.png'%(d,n),0); s=cv2.imread('../s18-fix1-src/f%04d.png'%n,0)
    m=cv2.GaussianBlur(s,(0,0),8)>170; m=cv2.erode(m.astype(np.uint8),np.ones((25,25),np.uint8))>0; m[y1:]=False
    kb=(slice(560,760),slice(1300,2100))
    gr,gs=g(r),g(s)
    if m.sum()<1000: continue
    pr,ps=np.percentile(gr[m],99),np.percentile(gs[m],99); kr,ks=np.percentile(gr[kb],99),np.percentile(gs[kb],99)
    R.append((pr,kr,np.percentile(gr[m],95),np.percentile(gs[m],95)));S.append((ps,ks))
    print(n,'owl p99 R %.0f S %.0f p95 R %.0f S %.0f| keys R %.0f S %.0f'%(pr,ps,R[-1][2],R[-1][3],kr,ks))
R=np.array(R);S=np.array(S); print('MEAN owl p99 R %.0f S %.0f p95 R %.0f S %.0f | keys R %.0f S %.0f'%(R[:,0].mean(),S[:,0].mean(),R[:,2].mean(),R[:,3].mean(),R[:,1].mean(),S[:,1].mean()))
