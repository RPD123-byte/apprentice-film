import json, numpy as np, cv2, sys, os
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s14f1'
T=float(sys.argv[1]); rd=sys.argv[2]; out=sys.argv[3]
sys.argv=['x',S+'/fills.json',rd,'/dev/null']
__file__='/Users/computer/rootline/apprentice-film/src/shots/s14/trace/tone2.py'
src=open(__file__).read().split('fills = sorted')[0]
exec(src)
fills = sorted(F['fills'], key=lambda f: (order.index(f['layer']), f['idx']))
k=int(round((T-40)/0.04)); t=T; d=DOLLY[k]
import glob
fp=glob.glob(f'{rd}/frame-*-at-{T:g}s.png')[0]
A=cv2.imread(fp)
idx=np.full(A.shape[:2],-1,np.int32)
for i,f in enumerate(fills):
    pl=planes[f['layer']]; Cc=np.array([1105,cyat(t)]) if f['layer'] in ('deskTop','deskBase','under') else C
    polys=[]
    for sub in f['subs']:
        q=clip(sub,pl,d) if len(pl)<=3 else sub
        if len(q)<3: continue
        P=mapp(q,pl,d,Cc)
        if np.abs(P).max()>20000: continue
        polys.append(np.round(P*4).astype(np.int32))
    if polys:
        m=np.zeros(A.shape[:2],np.uint8); cv2.fillPoly(m,polys,1,lineType=cv2.LINE_8,shift=2); idx[m>0]=i
L=np.where(idx>=0, np.array([order.index(f['layer']) for f in fills])[np.maximum(idx,0)], -1)
cols=np.array([[80,80,80],[255,0,0],[0,255,0],[0,0,255],[255,255,0],[255,0,255],[0,255,255],[255,128,0],[128,0,255]])
over=A.copy(); mask=L>=0
over[mask]=(0.5*A[mask]+0.5*cols[L[mask]%9]).astype(np.uint8)
cv2.imwrite(out, cv2.resize(over,None,fx=0.5,fy=0.5))
print(list(zip(order,cols.tolist())))
