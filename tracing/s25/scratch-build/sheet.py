import cv2,numpy as np,sys
R='snapshots/s19-rev1-dev/all/'; S='snapshots/s19-rev1-src/'
out=sys.argv[1]; k0,k1,step=int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]); x0,y0,x1,y1=map(int,sys.argv[5:9]); tw=int(sys.argv[9]) if len(sys.argv)>9 else 420
cols=int(sys.argv[10]) if len(sys.argv)>10 else 2
tiles=[]
for k in range(k0,k1+1,step):
    t=k/25
    r=cv2.imread(R+f'r-{t:.2f}.png'); s=cv2.imread(S+f'f{k:04d}.png')
    a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
    th=int(a.shape[0]*tw/a.shape[1])
    a=cv2.resize(a,(tw,th),interpolation=cv2.INTER_AREA); b=cv2.resize(b,(tw,th),interpolation=cv2.INTER_AREA)
    cv2.putText(a,f'R {t:.2f}',(4,18),0,0.55,(0,255,255),1); cv2.putText(b,f'S {t:.2f}',(4,18),0,0.55,(0,255,255),1)
    tiles.append(np.hstack([a,np.full((th,4,3),(0,0,255),np.uint8),b,np.full((th,10,3),0,np.uint8)]))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
rows=[np.vstack([r,np.zeros((6,r.shape[1],3),np.uint8)]) for r in rows]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(tiles))
