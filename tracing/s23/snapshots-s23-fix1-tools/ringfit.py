import sys,cv2,numpy as np,re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
t=open('/Users/computer/rootline/apprentice-film/src/shots/s23/tracks.js').read()
SHK=eval(re.search(r'export const SHAKE = (\[.*?\]);',t,re.S).group(1))
sh={round(a*25):(dx,dy) for a,dx,dy in SHK}
g0=np.median(np.stack([cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(np.float32) for k in (2305,2309,2313)]),0)
B0=cv2.GaussianBlur(g0,(0,0),4)
def pts(k,y0=700,thr=18,step=20):
    g=cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(np.float32)
    dx,dy=sh.get(k,(0,0))
    g=cv2.warpAffine(g,np.float32([[1,0,-dx],[0,1,-dy]]),(2206,946),borderMode=cv2.BORDER_REPLICATE)
    d=cv2.GaussianBlur(g,(0,0),4)-B0
    P=[]
    for x in range(10,2206,step):
        col=d[y0:944,x]; y=int(np.argmax(col)); v=col[y]
        if v>thr and y+y0<942: P.append((x,y+y0,v))
    return np.array(P,float),d
def fit(P):
    # axis-aligned ellipse: A x^2 + C y^2 + D x + E y = 1
    x,y=P[:,0],P[:,1]
    M=np.stack([x*x,y*y,x,y],1); sol,*_=np.linalg.lstsq(M,np.ones_like(x),rcond=None)
    A,C,D,E=sol
    cx=-D/(2*A); cy=-E/(2*C); F=1+A*cx*cx+C*cy*cy
    return cx,cy,np.sqrt(F/A) if F/A>0 else np.nan,np.sqrt(F/C) if F/C>0 else np.nan
if __name__=='__main__':
    for k in map(int,sys.argv[1:]):
        P,d=pts(k)
        # iterative outlier removal
        keep=np.ones(len(P),bool)
        for it in range(4):
            if keep.sum()<6: break
            cx,cy,rx,ry=fit(P[keep])
            r=np.abs(np.sqrt(((P[:,0]-cx)/rx)**2+((P[:,1]-cy)/ry)**2)-1)*ry
            keep=r<max(6,np.percentile(r[keep],70))
        print(k,'n %d/%d  cx %.0f cy %.0f rx %.0f ry %.0f  xs %d-%d  vmean %.0f'%(keep.sum(),len(P),cx,cy,rx,ry,P[keep,0].min(),P[keep,0].max(),P[keep,2].mean()))
