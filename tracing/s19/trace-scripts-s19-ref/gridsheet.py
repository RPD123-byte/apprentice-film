import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
ts=[float(x) for x in sys.argv[2].split(',')]; out=sys.argv[1]; sc=float(sys.argv[3]) if len(sys.argv)>3 else 0.5
tiles=[]
for t in ts:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    for x in range(0,2206,50):
        col=(0,0,255) if x%500==0 else ((0,200,255) if x%100==0 else (0,120,160))
        cv2.line(f,(int(x*sc),0),(int(x*sc),f.shape[0]),col,1)
        if x%100==0: cv2.putText(f,str(x),(int(x*sc)+2,12),0,0.38,(0,255,255),1)
    for y in range(0,946,50):
        col=(0,0,255) if y%500==0 else ((0,200,255) if y%100==0 else (0,120,160))
        cv2.line(f,(0,int(y*sc)),(f.shape[1],int(y*sc)),col,1)
        if y%100==0: cv2.putText(f,str(y),(2,int(y*sc)-2),0,0.38,(0,255,255),1)
    cv2.putText(f,f'{t:.2f}',(f.shape[1]-70,f.shape[0]-8),0,0.6,(0,255,0),2)
    tiles.append(f)
cols=int(sys.argv[4]) if len(sys.argv)>4 else 1
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
