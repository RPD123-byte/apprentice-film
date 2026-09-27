# showtr.py tr.json x0 y0 x1 y1 out.jpg [N] : draw traced strokes (top N) next to the source crop
import cv2, sys, json, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
T=json.load(open(sys.argv[1])); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; N=int(sys.argv[7]) if len(sys.argv)>7 else 999
c=cv2.VideoCapture(V); ok,f=c.read(); k=3
src=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
cv=np.full_like(src,235)
for i,r in enumerate(T[:N]):
    p=r['p']
    for j in range(len(p)-1):
        w=max(1,int(round((r['w'][j]+r['w'][j+1])/2*k*0.8)))
        v=int((r['v'][j]+r['v'][j+1])/2)
        cv2.line(cv,(int((p[j][0]-x0)*k),int((p[j][1]-y0)*k)),(int((p[j+1][0]-x0)*k),int((p[j+1][1]-y0)*k)),(v,v,v),w,cv2.LINE_AA)
    cv2.putText(cv,str(i),(int((p[0][0]-x0)*k),int((p[0][1]-y0)*k)),0,0.35,(0,0,255),1)
cv2.imwrite(out,np.hstack([cv,src]),[cv2.IMWRITE_JPEG_QUALITY,88])
