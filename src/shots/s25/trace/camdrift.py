import cv2,numpy as np,json
def L(f): return cv2.imread(f'src/f{f:05d}.png',0).astype(np.float32)
ref=2615
R=cv2.GaussianBlur(L(ref),(0,0),1.5)
mask=np.zeros(R.shape,np.uint8)
mask[150:900,150:760]=1; mask[150:900,1480:2020]=1; mask[140:360,150:2020]=1
mask[250:360,700:1500]=0   # scissors / head region over the banner (spin + float scissors)
out={}
for f in range(2577,2763):
    A=cv2.GaussianBlur(L(f),(0,0),1.5)
    w=np.eye(2,3,dtype=np.float32)
    try:
        cc,w=cv2.findTransformECC(R,A,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-6),mask,5)
    except cv2.error: cc=0
    out[f]=[float(cc)]+w.reshape(-1).tolist()
    if f%5==0: print(f'{f/25:.2f} cc {cc:.3f} a {w[0,0]:.4f} {w[0,1]:.4f} {w[0,2]:.2f} | {w[1,0]:.4f} {w[1,1]:.4f} {w[1,2]:.2f}')
json.dump(out,open('camdrift.json','w'))
