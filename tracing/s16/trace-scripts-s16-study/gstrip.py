import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
t0,t1,step,out=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3]),sys.argv[4]
x0,y0,x1,y1=[int(v) for v in sys.argv[5:9]]; tw=int(sys.argv[9]) if len(sys.argv)>9 else 800; cols=int(sys.argv[10]) if len(sys.argv)>10 else 2
gs=int(sys.argv[11]) if len(sys.argv)>11 else 50
tiles=[]; t=t0
while t<=t1+1e-6:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    f=f[y0:y1,x0:x1].copy(); k=tw/(x1-x0); f=cv2.resize(f,(tw,int((y1-y0)*k)),interpolation=cv2.INTER_AREA)
    for X in range((x0//gs+1)*gs,x1,gs):
        xx=int((X-x0)*k); cv2.line(f,(xx,0),(xx,f.shape[0]),(0,160,255) if X%(gs*2) else (0,0,255),1); cv2.putText(f,str(X),(xx+2,12),0,0.35,(0,255,255),1)
    for Y in range((y0//gs+1)*gs,y1,gs):
        yy=int((Y-y0)*k); cv2.line(f,(0,yy),(f.shape[1],yy),(0,160,255) if Y%(gs*2) else (0,0,255),1); cv2.putText(f,str(Y),(2,yy-2),0,0.35,(0,255,255),1)
    cv2.putText(f,f"{t:.2f}",(f.shape[1]-60,20),0,0.55,(0,255,0),2); tiles.append(f); t+=step
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(tiles))
