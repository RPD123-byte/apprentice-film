import cv2, numpy as np, sys
def m(r,s):
    a=cv2.imread(s,0).astype(np.float32); b=cv2.imread(r,0).astype(np.float32)
    A=cv2.GaussianBlur(a,(0,0),12);B=cv2.GaussianBlur(b,(0,0),12)
    sa=cv2.GaussianBlur(a,(0,0),3)>60; sb=cv2.GaussianBlur(b,(0,0),3)>60
    box=np.abs(A-B)[0:946,640:1960].mean(); mm=np.abs(A-B)[sa|sb].mean()
    iou=(sa&sb).sum()/(sa|sb).sum()
    # left silhouette edge x at given rows
    edge=[]
    for y in [420,500,560,600,660,720,780]:
        xs=np.where(sa[y,600:1300])[0]; xr=np.where(sb[y,600:1300])[0]
        edge.append((y, 600+xs[0] if len(xs) else -1, 600+xr[0] if len(xr) else -1))
    return box,mm,iou,edge
for r,s in zip(sys.argv[1::2],sys.argv[2::2]):
    box,mm,iou,edge=m(r,s)
    print(r.split('/')[-1], 'boxMAE %.2f maskMAE %.2f IoU %.3f'%(box,mm,iou), 'leftEdge(y,src,ren):',edge)
