import cv2, numpy as np, sys, json
# strip.py out.jpg frames(a-b) x0 y0 x1 y1 [scale] [track:A|none] [cols]
out=sys.argv[1]; a,b=map(int,sys.argv[2].split('-')); x0,y0,x1,y1=map(int,sys.argv[3:7])
sc=float(sys.argv[7]) if len(sys.argv)>7 else 1; tr=sys.argv[8] if len(sys.argv)>8 else 'none'; cols=int(sys.argv[9]) if len(sys.argv)>9 else 6
PATH={}
if tr=='A':
    import re
    src=open('../src/shots/s18/shotA.js').read()
    m=re.search(r'PATH_A = \[(.*?)\];',src,re.S).group(1)
    for f,dx,dy in re.findall(r'\[(\d+), (-?\d+), (-?\d+)\]',m): PATH[int(f)]=(int(dx),int(dy))
tiles=[]
for n in range(a,b+1):
    dx,dy=PATH.get(n,(0,0))
    r=cv2.imread('s18-rev2-h/fwd/r%d.png'%n); s=cv2.imread('s18-rev2-src/f%04d.png'%n)
    X0,X1=max(0,x0+dx),min(2206,x1+dx); Y0,Y1=max(0,y0+dy),min(946,y1+dy)
    A=np.zeros((y1-y0,x1-x0,3),np.uint8); B=A.copy()
    A[Y0-(y0+dy):Y0-(y0+dy)+(Y1-Y0),X0-(x0+dx):X0-(x0+dx)+(X1-X0)]=r[Y0:Y1,X0:X1]
    B[Y0-(y0+dy):Y0-(y0+dy)+(Y1-Y0),X0-(x0+dx):X0-(x0+dx)+(X1-X0)]=s[Y0:Y1,X0:X1]
    t=np.vstack([A,np.full((3,A.shape[1],3),(0,0,255),np.uint8),B])
    if sc!=1: t=cv2.resize(t,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_LINEAR)
    cv2.putText(t,str(n),(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,0,255),1)
    t=np.pad(t,((2,2),(2,2),(0,0)))
    tiles.append(t)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out)
