# Python rasterizer of s28 trace data (regions + ink), for debugging keys without the browser.
import json,re,sys,cv2,numpy as np
def load_js(p):
    s=open(p).read(); a=s.index('{'); b=s.rindex('}')
    return json.loads(s[a:b+1])
def hexbgr(h): return (int(h[5:7],16),int(h[3:5],16),int(h[1:3],16))
def paint(D,W=2206,H=946,bg=None,S=1):
    im=np.zeros((H*S,W*S,3),np.uint8); al=np.zeros((H*S,W*S),np.uint8)
    if bg: im[:]=hexbgr(bg); al[:]=255
    def rings(rs,col,img,alpha):
        m=np.zeros((H*S,W*S),np.uint8)
        for r in rs:
            t=np.zeros_like(m); cv2.fillPoly(t,[np.int32(np.array(r)*S)],255); m^=t
        img[m>0]=col; alpha[m>0]=255
    for R in D.get('regions',[]):
        c=R['c'] if 'c1' not in R else R['c']
        if 'g' in R:
            # linear ramp
            m=np.zeros((H*S,W*S),np.uint8)
            for r in R['r']:
                t=np.zeros_like(m); cv2.fillPoly(t,[np.int32(np.array(r)*S)],255); m^=t
            ys,xs=np.nonzero(m)
            x0,y0,x1,y1=[v*S for v in R['g']]; d=np.array([x1-x0,y1-y0]); L2=max(1e-6,d@d)
            u=np.clip(((xs-x0)*d[0]+(ys-y0)*d[1])/L2,0,1)[:,None]
            c0=np.array(hexbgr(R['c']),float); c1=np.array(hexbgr(R['c1']),float)
            im[ys,xs]=(c0*(1-u)+c1*u).astype(np.uint8); al[ys,xs]=255
        else: rings(R['r'],hexbgr(c),im,al)
    for layer in (0,1):
        for I in D.get('ink',[]):
            if I['l']==layer: rings(I['r'],hexbgr(I['c']),im,al)
    return im,al
if __name__=='__main__':
    D=load_js(sys.argv[1]); im,al=paint(D)
    out=im.copy(); out[al==0]=(255,0,255)
    cv2.imwrite(sys.argv[2],out)
