# Snap hand-read outline points onto the nearest ink line (darkest ridge of the blurred luminance) along the local
# normal, within +-R px. Measurement aid: refines positions of points I read off gridded crops.
# usage (as module): snap(points, img_gray, R=8, closed=False) -> points
import numpy as np, cv2
def snap(P, gray, R=8, closed=False, sigma=1.2):
    g=cv2.GaussianBlur(gray.astype(np.float32),(0,0),sigma)
    P=np.float32(P); n=len(P); out=P.copy()
    for i in range(n):
        a=P[(i-1)%n] if (closed or i>0) else P[i]; b=P[(i+1)%n] if (closed or i<n-1) else P[i]
        t=b-a; L=np.hypot(*t)
        if L<1e-6: continue
        nx,ny=-t[1]/L,t[0]/L
        best=None
        for d in np.arange(-R,R+0.01,0.5):
            x,y=P[i][0]+nx*d,P[i][1]+ny*d
            if 0<=x<g.shape[1]-1 and 0<=y<g.shape[0]-1:
                v=cv2.getRectSubPix(g,(1,1),(float(x),float(y)))[0,0]
                if best is None or v<best[0]: best=(v,x,y)
        if best: out[i]=[best[1],best[2]]
    return out
def overlay(img, polys, out, zoom=1.0, crop=None):
    im=img.copy()
    for P,col in polys:
        cv2.polylines(im,[np.int32(np.round(P))],False,col,1)
        for p in P: cv2.circle(im,tuple(np.int32(np.round(p))),2,col,-1)
    if crop: x0,y0,x1,y1=crop; im=im[y0:y1,x0:x1]
    if zoom!=1: im=cv2.resize(im,None,fx=zoom,fy=zoom,interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
