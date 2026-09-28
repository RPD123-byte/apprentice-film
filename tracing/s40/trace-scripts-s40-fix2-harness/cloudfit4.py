import numpy as np,cv2,json
A=np.load('Amap.npy'); lay=np.load('lay.npy'); ok=np.load('ok.npy'); dist=np.load('dist.npy')
H,W=lay.shape
w=ok.astype(np.float32); Ab=cv2.GaussianBlur(np.where(ok,A,0).astype(np.float32),(0,0),3)/(cv2.GaussianBlur(w,(0,0),3)+1e-6)
res=[]
fit=np.full((H,W),np.nan,np.float32)
for i in range(9):
    m=ok&(lay==i); a=Ab[m]; d=dist[m]
    best=None
    for d0 in range(4,60,2):
        for ww in [2,4,6,9,13,18,25]:
            s=np.clip((d-d0)/ww*0.5+0.5,0,1); s=s*s*(3-2*s)
            M=np.c_[np.ones_like(s),s]
            c,*_=np.linalg.lstsq(M,a,rcond=None); r=(a-M@c).std()
            if best is None or r<best[0]: best=(r,d0,ww,c)
    r,d0,ww,c=best
    print(i,'n',m.sum(),'d0',d0,'w',ww,'base %.3f amp %.3f'%(c[0],c[1]),'resid %.3f (std %.3f)'%(r,a.std()))
    res.append([round(float(c[0]),3),round(float(c[1]),3),d0,ww])
    mm=lay==i; s=np.clip((dist[mm]-d0)/ww*0.5+0.5,0,1); s=s*s*(3-2*s); fit[mm]=c[0]+c[1]*s
json.dump(res,open('cloudfit4.json','w'))
np.save('fit4.npy',fit)
def cm(a,m):
  v=np.clip(np.nan_to_num(a)*255/0.8,0,255).astype(np.uint8); c=cv2.applyColorMap(v,cv2.COLORMAP_JET); c[~m]=0; return c
Ab6=cv2.GaussianBlur(np.where(ok,A,0).astype(np.float32),(0,0),5)/(cv2.GaussianBlur(w,(0,0),5)+1e-6)
out=np.vstack([cm(Ab6,ok)[560:946],cm(fit,lay>=0)[560:946]])
cv2.imwrite('v-Afit4.jpg',cv2.resize(out,None,fx=0.5,fy=0.5))
