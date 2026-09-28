import cv2, json, sys, numpy as np
# rs.py n0 n1 step x0 y0 x1 y1 out [tw] [cols]  -> for each frame: render tile above source tile
n0,n1,st=map(int,sys.argv[1:4]); x0,y0,x1,y1=map(int,sys.argv[4:8]); out=sys.argv[8]
tw=int(sys.argv[9]) if len(sys.argv)>9 else 220; cols=int(sys.argv[10]) if len(sys.argv)>10 else 8
base='/Users/computer/rootline/apprentice-film/'
idx=json.load(open(base+'snapshots/s20-rev1-crops/index.json'))
tiles=[]
for n in range(n0,n1+1,st):
    a=cv2.imread(base+idx[str(n)][0])[y0:y1,x0:x1]; b=cv2.imread(base+f'snapshots/s20-rev1-src/n{n:04d}.png')[y0:y1,x0:x1]
    th=int(a.shape[0]*tw/a.shape[1])
    a=cv2.resize(a,(tw,th),interpolation=cv2.INTER_AREA); b=cv2.resize(b,(tw,th),interpolation=cv2.INTER_AREA)
    cv2.putText(a,f"R {n/25:.2f}",(3,14),0,0.45,(0,255,255),1); cv2.putText(b,f"S {n/25:.2f}",(3,14),0,0.45,(0,200,255),1)
    t=np.vstack([a,np.full((3,tw,3),(0,0,200),np.uint8),b,np.full((6,tw,3),40,np.uint8)]); tiles.append(t)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack([np.hstack([x,np.full((x.shape[0],3,3),40,np.uint8)]) for x in tiles[i:i+cols]]) for i in range(0,len(tiles),cols)]
cv2.imwrite(base+out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
