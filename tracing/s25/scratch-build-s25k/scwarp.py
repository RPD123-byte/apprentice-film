import cv2,numpy as np,json,sys
from segm import L
def g(f): return cv2.GaussianBlur(cv2.cvtColor(L(f).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2)
def trace_mask(k):
    T=json.load(open(f't_{k}.json')); m=np.zeros((946,2206),np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    return m
def ecc_box(src,dst,box,init):
    x0,y0,x1,y1=box
    A=g(src); B=g(dst); w=np.float32(init)
    M=np.zeros(A.shape,np.uint8); M[y0:y1,x0:x1]=1
    try: cc,w=cv2.findTransformECC(A,B,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-6),M,5)
    except cv2.error as e: cc=-1
    return cc,w
res={}
for dst,src,dy in [(2589,'hips1',5),(2588,'hips1',35),(2587,'hips1',60),(2586,'crouch',-25)]:
    S=json.load(open(f't_{src}.json'))['frame']
    out=[]
    for side,box in [('L',(640,600,960,905)),('R',(1210,600,1500,905))]:
        init=[[1,0,0],[0,1,dy]]
        cc,w=ecc_box(S,dst,box,init)
        out.append((side,cc,w.tolist()))
        print(dst,src,side,'cc %.3f'%cc, np.round(w,3).tolist())
    res[dst]={'src':src,'L':out[0][2],'R':out[1][2],'ccL':out[0][1],'ccR':out[1][1]}
json.dump(res,open('scwarp.json','w'))
