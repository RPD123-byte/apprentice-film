# owlface2.py : the owl's face past 21.64 (where b1's measured owl face stopped), frame by frame to 22.32 (its near eye
# is visible until then): the head's motion (an ECC affine of the head region between consecutive source frames,
# composed onto b1's 21.64 head affine), each eye measured on its frame (the dark iris: a compact dark blob near where
# the head motion carries the previous eye, an ellipse fitted to its outline; catchlights: the bright blobs inside),
# and the beak (ECC translation of the previous frame's beak patch). Writes snapshots/s04-fix1w/owlface2.json.
# Measurements only.
import cv2, numpy as np, json, re, os
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
G=lambda fi: cv2.cvtColor(cv2.imread(f'{SP}/{fi}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
s=open('/Users/computer/rootline/apprentice-film/src/shots/s04/owlface.js').read()
FF=json.loads(s[s.index('{',s.index('FACE_FRAMES = ')):s.index('};',s.index('FACE_FRAMES = '))+1])
A=np.array(FF['21.64']['A']).reshape(2,3).astype(np.float64)
eyes=[e[:2] for e in FF['21.64']['e']]
beak0=np.array([[1664.8,361.5],[1681.8,378.0],[1664.6,403.9],[1649.4,376.5]])   # hold-frame beak kite
bk=A[:,:2]@beak0.mean(0)+A[:,2]+np.array(FF['21.64']['b'])
HEAD=np.array([[1560,190],[1780,190],[1780,420],[1560,420]],np.float64)
out={}
prev=cv2.GaussianBlur(G(541),(0,0),1.2)
for f in range(542,559):
    cur=cv2.GaussianBlur(G(f),(0,0),1.2)
    t=f'{f/25:.2f}'
    if f==552: out[t]=out[f'{(f-1)/25:.2f}']; prev=cur; continue
    hc=HEAD@A[:,:2].T+A[:,2]
    x0,y0=np.floor(hc.min(0)).astype(int); x1,y1=np.ceil(hc.max(0)).astype(int)
    x0,y0=max(0,x0),max(0,y0); x1,y1=min(2206,x1),min(946,y1)
    tm=prev[y0:y1,x0:x1]
    W0=np.array([[1,0,x0],[0,1,y0]],np.float32)
    try: cc,Wp=cv2.findTransformECC(tm,cur,W0,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-5),None,5)
    except cv2.error as e: cc,Wp=-1,W0
    L=Wp[:,:2].astype(np.float64); tt=Wp[:,2]-L@np.array([x0,y0]); Inc=np.hstack([L,tt[:,None]])
    A=np.hstack([Inc[:,:2]@A[:,:2],(Inc[:,:2]@A[:,2]+Inc[:,2])[:,None]])
    # eyes
    E=[]
    for (ex,ey) in eyes:
        if ex is None: E.append(None); continue
        px,py=Inc[:,:2]@np.array([ex,ey])+Inc[:,2]
        r=40; X0,Y0=int(px-r),int(py-r); X1,Y1=int(px+r),int(py+r)
        if X0<0 or Y0<0 or X1>2206 or Y1>946: E.append(None); continue
        patch=cur[Y0:Y1,X0:X1]
        dk=(patch<70).astype(np.uint8); dk=cv2.morphologyEx(dk,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
        # fill the catchlights inside the dark disc
        cs,_=cv2.findContours(dk,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        best=None
        for c in cs:
            a=cv2.contourArea(c)
            if a<60 or len(c)<8: continue
            (cx,cy),(w,h),ang=cv2.fitEllipse(c)
            d=np.hypot(cx+X0-px,cy+Y0-py)
            if d>22 or max(w,h)>70 or min(w,h)<6: continue
            sc=a-8*d
            if best is None or sc>best[0]: best=(sc,cx+X0,cy+Y0,w/2,h/2,ang,c)
        if not best: E.append(None); continue
        _,cx,cy,a1,a2,ang,c=best
        # catchlights: bright blobs inside the fitted ellipse
        m=np.zeros(patch.shape,np.uint8); cv2.ellipse(m,((cx-X0,cy-Y0),(a1*2*0.92,a2*2*0.92),ang),255,-1)
        br=((patch>185)&(m>0)).astype(np.uint8); n,lab,st,cen=cv2.connectedComponentsWithStats(br)
        hl=sorted([[round(float(cen[j][0]+X0),1),round(float(cen[j][1]+Y0),1),round(float(np.sqrt(st[j,4]/np.pi)),1)] for j in range(1,n) if st[j,4]>=3],key=lambda h:-h[2])[:2]
        E.append([round(float(cx),1),round(float(cy),1),round(float(a1),1),round(float(a2),1),round(float(ang),1),hl])
    eyes=[(e[0],e[1]) if e else (None,None) for e in E]
    # beak: translation of the previous frame's beak patch
    bx,by=Inc[:,:2]@bk+Inc[:,2]
    r=22; tpl=prev[int(bk[1]-r):int(bk[1]+r),int(bk[0]-r):int(bk[0]+r)]
    try:
        W1=np.array([[1,0,bx-r],[0,1,by-r]],np.float32)
        cc2,W1=cv2.findTransformECC(tpl,cur,W1,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-4),None,3)
        bk=np.array([W1[0,2]+r,W1[1,2]+r])
    except cv2.error: bk=np.array([bx,by])
    bshift=bk-(A[:,:2]@beak0.mean(0)+A[:,2])
    out[t]={'A':[round(float(v),4) for v in A.ravel()],'e':E,'b':[round(float(bshift[0]),1),round(float(bshift[1]),1)],'cc':round(float(cc),3)}
    print(t,'cc',round(float(cc),3),'eyes',[(e[0],e[1],e[2],e[3]) if e else None for e in E],'hl',[len(e[5]) if e else 0 for e in E],'beak',np.round(bk,1))
    prev=cur
json.dump(out,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/owlface2.json','w'))
