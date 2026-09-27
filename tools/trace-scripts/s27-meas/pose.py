import json, numpy as np, cv2
F=2520.; CX,CY=1103.,473.
K=np.array([[F,0,CX],[0,F,CY],[0,0,1.]])
PW=30.4; S=PW/2206.   # cm per page px
def load_H(fn='screenT_118.0_129.3.json'):
    d=json.load(open(fn)); return {float(t):np.array(v['H']) for t,v in d.items()}
def pose_from_H(H):
    gx,gy=np.meshgrid(np.linspace(0,2206,6),np.linspace(0,946,4))
    P=np.stack([gx.ravel(),gy.ravel()],1).astype(np.float32)
    I=cv2.perspectiveTransform(P[None],H)[0]
    O=np.c_[P*S,np.zeros(len(P))].astype(np.float32)
    ok,r,tv=cv2.solvePnP(O,I,K,None,flags=cv2.SOLVEPNP_ITERATIVE)
    R,_=cv2.Rodrigues(r)
    proj,_=cv2.projectPoints(O,r,tv,K,None); err=np.abs(proj[:,0]-I).mean()
    return R,tv.ravel(),err
if __name__=='__main__':
    Hs=load_H()
    for t in sorted(Hs):
        if t>128.45 or round(t*25)%5: continue
        R,tv,err=pose_from_H(Hs[t])
        C=-R.T@tv   # camera centre in screen coords (cm): x right, y down, z toward the back of the screen (away from viewer side?)
        # camera forward axis in world
        fw=R.T@np.array([0,0,1.])
        yaw=np.degrees(np.arctan2(fw[0],fw[2])); pitch=np.degrees(np.arcsin(-fw[1]))
        print(f"{t:.2f} C=({C[0]:7.1f},{C[1]:7.1f},{C[2]:7.1f}) dist={np.linalg.norm(C-np.array([15.2,6.5,0])):6.1f} yaw={yaw:6.1f} pitch={pitch:6.1f} err={err:.2f}")
