# wing tips v2: the owl as the bright component connected to the body (pre-grade > THR), farthest points from each
# shoulder, in kit owl units (root/scale/bank from OWL_ROOT). Draws a check sheet.
import cv2, numpy as np, re, json, sys
from common import ungrade, src
T=open('/Users/computer/rootline/apprentice-film/src/shots/s02/hand/owltrack.js').read()
R=[float(v) for v in re.search(r'OWL_ROOT = \[(.*?)\]',T).group(1).split(',')]
THR=float(sys.argv[1]) if len(sys.argv)>1 else 225
res={}; tiles=[]
for f in range(405,478):
    k=f-397; x,y,s,b=R[4*k:4*k+4]
    im=ungrade(src(f).astype(np.float32),f/25); B=cv2.GaussianBlur(im,(0,0),1.5)
    m=(B>THR).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m,8)
    # component at the body: sample a few points round the root
    ids={}
    for dx in range(-40,41,10):
        for dy in range(-40,41,10):
            px,py=int(x+dx*s),int(y+dy*s)
            if 0<=px<2206 and 0<=py<946 and lab[py,px]>0: ids[lab[py,px]]=ids.get(lab[py,px],0)+1
    if not ids: print(f,'no body'); continue
    cid=max(ids,key=ids.get); M=(lab==cid)
    ys,xs=np.nonzero(M)
    dx=(xs-x)/s; dy=(ys-y)/s; c,sn=np.cos(-b),np.sin(-b); ux=dx*c-dy*sn; uy=dx*sn+dy*c
    out=[]
    for side,sel,S in [('L',ux<-150,(-112,-84)),('R',ux>150,(122,-78))]:
        if sel.sum()<30: out.append(None); continue
        d=np.hypot(ux[sel]-S[0],uy[sel]-S[1]); i=np.argmax(d); out.append([round(float(ux[sel][i]),1),round(float(uy[sel][i]),1)])
    res[f]=out
    # check tile
    t=cv2.cvtColor(np.clip(im,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR); t[M]=(t[M]*0.5+np.array([0,80,0])).astype(np.uint8)
    for p in out:
        if p is None: continue
        ca,sa=np.cos(b),np.sin(b); fx=x+s*(ca*p[0]-sa*p[1]); fy=y+s*(sa*p[0]+ca*p[1])
        cv2.circle(t,(int(fx),int(fy)),10,(0,0,255),3)
    w=int(1200*s); h=int(800*s); x0=int(x-w/2); y0=int(y-h*0.6)
    pd=cv2.copyMakeBorder(t,900,900,900,900,cv2.BORDER_CONSTANT); cr=pd[y0+900:y0+900+h,x0+900:x0+900+w]
    cr=cv2.resize(cr,(300,200)); cv2.putText(cr,str(f),(3,14),0,0.45,(0,255,255),1); tiles.append(cr)
json.dump(res,open(f'wingtips2_{int(THR)}.json','w'))
cols=8
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(f'z/tips2_{int(THR)}.jpg',np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]))
for f in sorted(res): print(f,res[f])
