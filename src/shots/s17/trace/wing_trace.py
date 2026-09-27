# Wing outline tracer for s17 (a measurement tool, not loaded by the film). For each drawing tick of the rise, the
# owl's lit silhouette is taken from the source frame (brighter than 185/255 and 25 above an owl-free plate of the
# page), the parts this shot draws itself from its pose model (head, body, headphones: rendered by the lab with only
# those layers) are removed, and the remaining large pieces left and right of the head are the wings. Their outer
# contours are simplified (RDP 0.6 px) and written as polygons in page px: wing_data.js. No pixels are stored.
# usage: python3 wing_trace.py LABDIR(hb) LABDIR(nb) OUT.js T1,T2,...
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
PLATE='/Users/computer/rootline/apprentice-film/snapshots/s17-lab/plate2.png'   # owl-free page: 51.4 left of x 560, 53.2 to 625, 53.12 right
hb,nb,out=sys.argv[1],sys.argv[2],sys.argv[3]; ticks=[float(v) for v in sys.argv[4].split(',')]
cap=cv2.VideoCapture(V)
bb=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(PLATE),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.0)
def rdp(P,eps):
    if len(P)<3: return list(P)
    a,b=P[0],P[-1]; ab=b-a; L=np.linalg.norm(ab)+1e-9
    dd=np.abs(ab[0]*(P[1:-1,1]-a[1])-ab[1]*(P[1:-1,0]-a[0]))/L
    i=int(np.argmax(dd))+1
    if dd[i-1]>eps: return rdp(P[:i+1],eps)[:-1]+rdp(P[i:],eps)
    return [a,b]
S=4
data={}
for t in ticks:
    cap.set(1,round(t*25)); ok,f=cap.read(); g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.0)
    M=((g>185)&(g-bb>25)).astype(np.uint8)
    # over the lit books (x < 700, y > 440) the wing is only a little brighter than the page: a difference test there
    lowL=np.zeros_like(M); lowL[440:600,500:700]=1
    M|=((g-bb>38)&(g>150)&(lowL>0)).astype(np.uint8)
    M[:, :500]=0; M[:, 880:]=0; M[:300]=0; M[600:]=0
    a=cv2.imread(f'{hb}/r-{t:.2f}.png',0).astype(np.float32); n=cv2.imread(f'{nb}/r-{t:.2f}.png',0).astype(np.float32)
    B=(np.abs(a-n)>6).astype(np.uint8); B=cv2.morphologyEx(B,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    ys,xs=np.nonzero(B); hx=xs.mean(); hy=ys.mean()
    # the wings reach a few px under our body and head (no seam where they meet; the overlap is covered)
    W=M.copy(); W[cv2.erode(B,np.ones((7,7),np.uint8))>0]=0
    W=cv2.morphologyEx(W,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))      # drop 1-2 px strands (steam, lines)
    W=cv2.morphologyEx(W,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    nlab,lab,st,cen=cv2.connectedComponentsWithStats(W)
    comps=[(st[i,4],i,cen[i]) for i in range(1,nlab) if st[i,4]>120]
    left=[c for c in comps if c[2][0]<hx-15 and c[2][1]<hy+70]
    right=[c for c in comps if c[2][0]>hx+15 and c[2][1]<hy+15]
    rec={}
    for nm,cs in (('L',left),('R',right)):
        if not cs: continue
        # the wing is the largest piece; merge pieces within 3 px of it (split by an inner line)
        cs.sort(reverse=True); main=(lab==cs[0][1]).astype(np.uint8)
        grow=cv2.dilate(main,np.ones((7,7),np.uint8))
        for c in cs[1:]:
            m=(lab==c[1]).astype(np.uint8)
            if (m&grow).any() and c[0]>40: main|=m
        main=cv2.morphologyEx(main,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
        up=cv2.resize(main*255,None,fx=S,fy=S,interpolation=cv2.INTER_LINEAR)
        up=cv2.GaussianBlur(up,(0,0),S*1.0)
        cnt,_=cv2.findContours((up>127).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        c=max(cnt,key=cv2.contourArea).reshape(-1,2).astype(float)
        k=int(np.argmax(np.hypot(*(c-c[0]).T)))            # split the closed contour at its farthest point
        P=np.array(rdp(c[:k+1],0.6*S)[:-1]+rdp(np.vstack([c[k:],c[:1]]),0.6*S)[:-1])
        pts=[[round((x+0.5)/S-0.5,1),round((y+0.5)/S-0.5,1)] for x,y in P]
        rec[nm]=sum(pts,[])
    # the lit mass round our head and body (the source's silhouette within 10 px of them): an underlay that fills
    # the seams where our body, head and the traced wings do not quite meet
    Mc=cv2.morphologyEx(M,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    mass=Mc&cv2.dilate(B,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))
    nl,lb,stt,_=cv2.connectedComponentsWithStats(mass)
    if nl>1:
        i=1+int(np.argmax(stt[1:,4])); m=(lb==i).astype(np.uint8)
        up=cv2.GaussianBlur(cv2.resize(m*255,None,fx=S,fy=S,interpolation=cv2.INTER_LINEAR),(0,0),S*0.6)
        cnt,_=cv2.findContours((up>127).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        c=max(cnt,key=cv2.contourArea).reshape(-1,2).astype(float)
        k=int(np.argmax(np.hypot(*(c-c[0]).T)))
        P=np.array(rdp(c[:k+1],0.8*S)[:-1]+rdp(np.vstack([c[k:],c[:1]]),0.8*S)[:-1])
        rec['M']=sum([[round((x+0.5)/S-0.5,1),round((y+0.5)/S-0.5,1)] for x,y in P],[])
    data[f'{t:.2f}']=rec
    print(t,{k:len(v)//2 for k,v in rec.items()},'head/body centre',round(hx),round(hy))
js=("// s17 wing outlines per drawing tick of the rise, traced from the source by trace/wing_trace.py: polygons in page px\n"
    "// (flat [x0, y0, x1, y1, ...]); L = the viewer-left wing, R = the viewer-right (raised) wing, M = the lit mass round\n// the head and body (an underlay). Measurement data only.\n"
    "export const WINGS = "+json.dumps(data,separators=(',',':'))+";\n")
open(out,'w').write(js); print('bytes',len(js))
