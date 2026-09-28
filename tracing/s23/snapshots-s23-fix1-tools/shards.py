import sys,cv2,numpy as np,re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
t=open('/Users/computer/rootline/apprentice-film/src/shots/s23/tracks.js').read()
S=eval(re.search(r'export const SHARDS = (\[\[.*?\]\]);',t,re.S).group(1))
G={k:cv2.GaussianBlur(cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),0.8) for k in range(2396,2427)}
def score(g,s):
    x0,y0,x1,y1=s[:4]; L=np.hypot(x1-x0,y1-y0); n=max(4,int(L/3))
    ux,uy=(x1-x0)/L,(y1-y0)/L; nx,ny=-uy,ux
    u=np.linspace(0.1,0.9,n); X=x0+(x1-x0)*u; Y=y0+(y1-y0)*u
    def samp(off):
        xx=np.clip(X+nx*off,0,2205); yy=np.clip(Y+ny*off,0,945)
        return cv2.remap(g,xx.astype(np.float32).reshape(1,-1),yy.astype(np.float32).reshape(1,-1),cv2.INTER_LINEAR)[0]
    on=np.max([samp(o) for o in (-1.5,0,1.5)],0)
    off=np.maximum(samp(6),samp(-6))
    return np.median(on-off)
out=[]
for s in S:
    sc=[score(G[k],s) for k in range(2396,2427)]
    ks=list(range(2396,2427))
    onset=None
    for i in range(len(ks)-2):
        if sc[i]>=25 and sc[i+1]>=25 and sc[i+2]>=25: onset=ks[i]; break
    old=round(s[4]*25)
    out.append((s,old,onset,sc))
    flag='' if onset is None or abs(onset-old)<3 else '  <<'
    print(s[:4],'old',old,'onset',onset,flag,' '.join('%d'%v for v in sc[3:]))
