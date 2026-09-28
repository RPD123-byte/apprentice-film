# Owl silhouette tracer for s17 (a measurement tool, not loaded by the film). For each drawing tick the owl's lit
# silhouette is taken from the source frame (brighter than 185/255 and 25 above an owl-free plate of the page; over
# the lit books a difference test), closed over its dark inner lines, holes filled, grown by 2 px, and its outer
# contour simplified (RDP 0.7 px): sil_data.js. The shot clips its own drawing of the owl's body, head, wings, tail
# and feet to it (the headphones are drawn unclipped). No pixels are stored.
# usage: python3 sil_trace.py OUT.js T1,T2,...
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
PLATE='/Users/computer/rootline/apprentice-film/snapshots/s17-lab/plate2.png'
out=sys.argv[1]; ticks=[float(v) for v in sys.argv[2].split(',')]
cap=cv2.VideoCapture(V)
bb=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(PLATE),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.0)
def rdp(P,eps):
    if len(P)<3: return list(P)
    a,b=P[0],P[-1]; ab=b-a; L=np.linalg.norm(ab)+1e-9
    dd=np.abs(ab[0]*(P[1:-1,1]-a[1])-ab[1]*(P[1:-1,0]-a[0]))/L
    i=int(np.argmax(dd))+1
    if dd[i-1]>eps: return rdp(P[:i+1],eps)[:-1]+rdp(P[i:],eps)
    return [a,b]
S=4; data={}
for t in ticks:
    cap.set(1,round(t*25)); ok,f=cap.read(); g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.0)
    M=((g>185)&(g-bb>25)).astype(np.uint8)
    low=np.zeros_like(M); low[440:600,330:700]=1
    M|=((g-bb>38)&(g>150)&(low>0)).astype(np.uint8)
    M[:, :330]=0; M[:, 930:]=0; M[:300]=0; M[600:]=0
    M=cv2.morphologyEx(M,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    M=cv2.morphologyEx(M,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    n,lab,st,_=cv2.connectedComponentsWithStats(M)
    if n<2: continue
    i=1+int(np.argmax(st[1:,4])); main=(lab==i).astype(np.uint8)
    # nearby pieces (feet, tail, feather tips cut off by a line) join the main one
    grow=cv2.dilate(main,np.ones((9,9),np.uint8))
    for j in range(1,n):
        if j!=i and st[j,4]>30 and ((lab==j)&(grow>0)).any(): main|=(lab==j).astype(np.uint8)
    cnt,_=cv2.findContours(main,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    fill=np.zeros_like(main); cv2.drawContours(fill,cnt,-1,1,-1)
    fill=cv2.dilate(fill,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    up=cv2.GaussianBlur(cv2.resize(fill*255,None,fx=S,fy=S,interpolation=cv2.INTER_LINEAR),(0,0),S*0.6)
    cnt,_=cv2.findContours((up>127).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    polys=[]
    for c in sorted(cnt,key=cv2.contourArea,reverse=True)[:3]:
        if cv2.contourArea(c)<60*S*S: continue
        c=c.reshape(-1,2).astype(float); k=int(np.argmax(np.hypot(*(c-c[0]).T)))
        P=np.array(rdp(c[:k+1],0.7*S)[:-1]+rdp(np.vstack([c[k:],c[:1]]),0.7*S)[:-1])
        polys.append(sum([[round((x+0.5)/S-0.5,1),round((y+0.5)/S-0.5,1)] for x,y in P],[]))
    data[f'{t:.2f}']=polys
    print(t,[len(p)//2 for p in polys])
js=("// s17 owl silhouettes per drawing tick, traced from the source by trace/sil_trace.py (outer contours, grown 2 px,\n"
    "// page px, flat [x0, y0, ...]). The shot clips its drawing of the owl to them. Measurement data only.\n"
    "export const SIL = "+json.dumps(data,separators=(',',':'))+";\n")
open(out,'w').write(js); print('bytes',len(js))
