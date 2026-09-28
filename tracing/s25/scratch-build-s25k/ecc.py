import cv2,numpy as np,sys
def L(f): return cv2.imread(f'src/f{f:05d}.png',0).astype(np.float32)
def ecc(ref,f,box,mode=cv2.MOTION_AFFINE,blur=2):
    x0,y0,x1,y1=box
    R=cv2.GaussianBlur(L(ref),(0,0),blur)[y0:y1,x0:x1]; A=cv2.GaussianBlur(L(f),(0,0),blur)[y0:y1,x0:x1]
    w=np.eye(2,3,dtype=np.float32)
    try:
        cc,w=cv2.findTransformECC(R,A,w,mode,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),None,5)
    except cv2.error as e: return None,None
    return cc,w
if __name__=='__main__':
    ref=int(sys.argv[1]); box=list(map(int,sys.argv[2:6])); fs=sys.argv[6]
    a,b,st=map(int,fs.split(':'))
    for f in range(a,b+1,st):
        cc,w=ecc(ref,f,box)
        if w is None: print(f,'fail'); continue
        # decompose: scale x,y, rotation, translation of box centre
        cx,cy=(box[2]-box[0])/2,(box[3]-box[1])/2
        dx=w[0,0]*cx+w[0,1]*cy+w[0,2]-cx; dy=w[1,0]*cx+w[1,1]*cy+w[1,2]-cy
        print(f'{f/25:.2f} cc {cc:.3f} sx {w[0,0]:.4f} sy {w[1,1]:.4f} shx {w[0,1]:.4f} shy {w[1,0]:.4f} dcx {dx:.1f} dcy {dy:.1f}')
