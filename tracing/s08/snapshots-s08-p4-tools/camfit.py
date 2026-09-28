# source-to-source camera: ECC affine of every source frame k against frame 764 (card text masked), composed with the
# table's M(764) (F0 -> frame 764), projected to a similarity by least squares over a grid of F0 points.
import cv2,numpy as np,sys,json
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import M
f0=cv2.GaussianBlur(cv2.cvtColor(cv2.imread('snapshots/s08-p4-src/f764.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
mask=np.full(f0.shape,255,np.uint8); mask[330:420,1480:1900]=0; mask[:14]=0
M0=np.vstack([M(764),[0,0,1]])
G=np.array([[x,y,1] for y in np.linspace(0,946,12) for x in np.linspace(0,2206,24)],float)
W=M(765).astype(np.float32); W=(np.vstack([W,[0,0,1]])@np.linalg.inv(M0))[:2].astype(np.float32)
rows=[]
for k in range(764,815):
    fk=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'snapshots/s08-p4-src/f{k}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
    if k==764: Wk=np.eye(2,3,dtype=np.float32); cc=1
    else:
        init=(np.vstack([M(k),[0,0,1]])@np.linalg.inv(M0))[:2].astype(np.float32)
        cc,Wk=cv2.findTransformECC(f0,fk,init,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-8),mask,5)
    T=np.vstack([Wk,[0,0,1]])@M0      # F0 -> frame k
    # similarity fit: [x';y'] = [[a,-b],[b,a]] [x;y] + [c;d]
    P=G@T.T
    A=[];bv=[]
    for (x,y,_),(X,Y,_) in zip(G,P):
        A.append([x,-y,1,0]); bv.append(X); A.append([y,x,0,1]); bv.append(Y)
    a,b,c,d=np.linalg.lstsq(np.array(A),np.array(bv),rcond=None)[0]
    s=np.hypot(a,b); rot=np.degrees(np.arctan2(b,a))
    Ms=np.array([[a,-b,c],[b,a,d]])
    resid=np.abs(G@Ms.T-P[:,:2]).max()
    tab=M(k)
    dtab=np.abs(G@tab.T-P[:,:2]).max()
    rows.append([round((k-764)/25,2),float(s),float(c),float(d),float(rot)])
    print(k,f'cc {cc:.5f} s {s:.5f} tx {c:.2f} ty {d:.2f} rot {rot:.4f} | sim resid max {resid:.2f} | table vs true max {dtab:.2f}')
json.dump(rows,open('snapshots/s08-p4-tools/cam_s2s.json','w'))
