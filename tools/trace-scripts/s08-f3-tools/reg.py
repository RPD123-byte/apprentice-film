import numpy as np, cv2, sys
S='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/'; R=sys.argv[1]
frames=[int(x) for x in sys.argv[2].split(',')]
def ecc(a,b):
    w=np.eye(2,3,dtype=np.float32)
    try:
        _,w=cv2.findTransformECC(b,a,w,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-5),None,5)
    except cv2.error: return (np.nan,np.nan)
    return w[0,2],w[1,2]
for k in frames:
    a=cv2.GaussianBlur(cv2.imread(f'{R}/r{k}.png').astype(np.float32).mean(-1),(0,0),2); b=cv2.GaussianBlur(cv2.imread(S+f'f{k}.png').astype(np.float32).mean(-1),(0,0),2)
    out=[]
    for (x0,y0,x1,y1) in [(0,0,1100,946),(1106,0,2206,946),(0,0,2206,473),(0,473,2206,946)]:
        out.append('%.2f,%.2f'%ecc(a[y0:y1,x0:x1],b[y0:y1,x0:x1]))
    print(k,'L',out[0],'R',out[1],'T',out[2],'B',out[3])
