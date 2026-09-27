import cv2, numpy as np, sys
def S(n): return cv2.imread(f'src/f{n}.png')
def R(n): return cv2.imread(f'all/r-{n/25:.3f}.png')
def pair(n, box, out, scale=1.0, vertical=False):
    x0,y0,x1,y1=box; s=S(n)[y0:y1,x0:x1]; r=R(n)[y0:y1,x0:x1]
    if scale!=1: s=cv2.resize(s,None,fx=scale,fy=scale,interpolation=cv2.INTER_NEAREST if scale>1 else cv2.INTER_AREA); r=cv2.resize(r,None,fx=scale,fy=scale,interpolation=cv2.INTER_NEAREST if scale>1 else cv2.INTER_AREA)
    sep=np.full((r.shape[0],6,3),255,np.uint8) if not vertical else np.full((6,r.shape[1],3),255,np.uint8)
    im=np.vstack([r,sep,s]) if vertical else np.hstack([r,sep,s])
    cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
if __name__=='__main__':
    n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
    pair(n,(x0,y0,x1,y1),sys.argv[6],sc, vertical=(len(sys.argv)>8))
