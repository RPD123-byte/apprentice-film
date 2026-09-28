import cv2, numpy as np, sys, re
# feetstrip.py DIR a b out [src|render|both] : crops x=(640+dx)-40..+380, y 470-680 with grid
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', open('../../src/shots/s18/shotA.js').read(), re.S).group(1))
P={r[0]:(r[1],r[2]) for r in PATH}
d,a,b,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]; mode=sys.argv[5] if len(sys.argv)>5 else 'both'
tiles=[]
for n in range(a,b+1):
    dx,dy=P[n]; x0=600+dx; x1=x0+420; y0,y1=470,680
    ims=[]
    if mode in('src','both'): ims.append(cv2.imread('../s18-fix1-src/f%04d.png'%n))
    if mode in('render','both'): ims.append(cv2.imread('%s/r%d.png'%(d,n)))
    col=[]
    for im in ims:
        c=im[y0:y1,max(0,x0):x1].copy()
        if x0<0: c=np.hstack([np.zeros((c.shape[0],-x0,3),np.uint8),c])
        for gx in range(0,420,50): cv2.line(c,(gx,0),(gx,4),(0,0,255),1)
        for gy in range(0,210,50): cv2.line(c,(0,gy),(4,gy),(0,0,255),1)
        cv2.putText(c,'%d x0=%d'%(n,x0),(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,255),1)
        col.append(c)
    tiles.append(np.vstack(col))
cols=4
rows=[np.hstack(tiles[i:i+cols]+[np.zeros_like(tiles[0])]*(cols-len(tiles[i:i+cols]))) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
