# settle fields in python (as s05.js settleField): disp(name,k) -> (dx, dy) full-frame maps of settled pos -> frame k pos
import json, numpy as np, cv2
D=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s05-p2-study/cache/settle_fields.json'))
KS=D['ks']; L=D['layers']; H,W=946,2206
def disp(name,k,shape=(H,W),ox=0,oy=0):
    F=L[name]; g=np.moveaxis(np.asarray(F['grids'][KS.index(k)],np.float32)/10,0,-1)
    yy,xx=np.mgrid[0:shape[0],0:shape[1]].astype(np.float32)
    fx=np.clip((xx+ox-F['x0'])/F['G'],0,F['nx']-1.0001); fy=np.clip((yy+oy-F['y0'])/F['G'],0,F['ny']-1.0001)
    dx=cv2.remap(g[...,0],fx,fy,cv2.INTER_LINEAR); dy=cv2.remap(g[...,1],fx,fy,cv2.INTER_LINEAR)
    return dx,dy
def backmap(img,name,k):
    """frame k image -> settled coordinates of layer name (sample img at settled + disp)"""
    dx,dy=disp(name,k); yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    return cv2.remap(img,xx+dx,yy+dy,cv2.INTER_LINEAR)
