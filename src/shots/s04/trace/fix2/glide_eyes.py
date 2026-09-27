# glide_eyes.py : his eyes on the glide frames 19.12-19.48 (478-487), measurement only. For each eye: an ECC affine
# (then translation check) of the eye region of source frame 488 (19.52, where s04/eyes2.js's track starts) against
# each glide frame, initialised by the face's measured pan (PENCIL_A composed with 19.52's inverse). Prints JSON
# {t: {L: [a,b,tx,c,d,ty], R: [...]}}: the map from 19.52 frame px to frame t px, and the correlation.
import cv2, numpy as np, json, sys
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
P=json.loads(sys.argv[1])
def ld(f,s=1.5): return cv2.GaussianBlur(cv2.imread(f'{SRC}/{f}.png',0).astype(np.float32),(0,0),s)
def M3(A): return np.vstack([np.array(A).reshape(2,3),[0,0,1]])
F0i=np.linalg.inv(M3(P['19.52']))
EYES={'L':(894,334),'R':(1272,324)}
out={}
for f in range(487,477,-1):
    t=f'{f/25:.2f}'; R0=M3(P[t])@F0i       # 19.52 px -> t px (face pan)
    # the source glide frames are motion-blurred: blur the template along the pan direction to match
    d=R0[:2,2]; I1=ld(f); T0=ld(488)
    v=np.array(P[f'{(f+1)/25:.2f}'] if f<487 else P['19.52']).reshape(2,3)[:,2]-np.array(P[t]).reshape(2,3)[:,2]
    L=np.hypot(*v)*0.45
    if L>2:
        k=np.zeros((int(2*L)+3,int(2*L)+3),np.float32); c=k.shape[0]//2; u=v/np.hypot(*v)
        cv2.line(k,(int(round(c-u[0]*L/2)),int(round(c-u[1]*L/2))),(int(round(c+u[0]*L/2)),int(round(c+u[1]*L/2))),1,1); k/=k.sum()
        T0=cv2.filter2D(T0,-1,k)
    res={}
    for e,(x,y) in EYES.items():
        x0,y0=int(x-100),int(y-55); tpl=T0[y0:y0+110,x0:x0+200].copy()
        w=np.array([[1,0,0],[0,1,0]],np.float32); A=R0[:2].astype(np.float32)
        # template px -> t px: A applied to (template px + (x0,y0))
        w=np.hstack([A[:,:2],(A[:,:2]@np.array([x0,y0])+A[:,2])[:,None]]).astype(np.float32)
        try: cc,w=cv2.findTransformECC(tpl,I1,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-6),None,3)
        except cv2.error: cc=-1
        Af=np.hstack([w[:,:2],(w[:,2]-w[:,:2]@np.array([x0,y0]))[:,None]])
        p0=R0[:2,:2]@np.array([x,y])+R0[:2,2]; p1=Af[:,:2]@np.array([x,y])+Af[:,2]
        print(t,e,f'cc {cc:.3f} pan-pred {p0[0]:.1f},{p0[1]:.1f} measured {p1[0]:.1f},{p1[1]:.1f} diff {p1[0]-p0[0]:+.1f},{p1[1]-p0[1]:+.1f}',file=sys.stderr)
        res[e]=[round(float(q),4) for q in Af.ravel()]; res[e+'cc']=round(float(cc),3)
    out[t]=res
print(json.dumps(out))
