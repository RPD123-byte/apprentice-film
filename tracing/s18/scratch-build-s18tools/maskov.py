import cv2,sys,glob,re,numpy as np
# silhouette overlay: owl mask (bright & differs from the clean bg) for render (red) and source (green)
d=sys.argv[1]; bgp=sys.argv[2]; out=sys.argv[3]; x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]
bg=cv2.imread(bgp,0).astype(float)
rows=[]
for f in sorted(glob.glob(d+'/frame-*.png')):
    a=cv2.imread(f,0).astype(float); b=cv2.imread(f.replace('frame-','ref-'),0).astype(float)
    def mask(g):
        m=((cv2.GaussianBlur(g,(0,0),3)>150)&(np.abs(cv2.GaussianBlur(g,(0,0),3)-cv2.GaussianBlur(bg,(0,0),3))>40)).astype(np.uint8)
        m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)); return m
    ma,mb=mask(a),mask(b)
    vis=np.dstack([b*0.35,b*0.35,b*0.35]).astype(np.uint8)
    ca,_=cv2.findContours(ma,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cb,_=cv2.findContours(mb,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(vis,[c for c in cb if cv2.contourArea(c)>800],-1,(0,255,0),2); cv2.drawContours(vis,[c for c in ca if cv2.contourArea(c)>800],-1,(0,0,255),2)
    c=vis[y0:y1,x0:x1]
    for x in range((x0//50+1)*50,x1,50): cv2.line(c,(x-x0,0),(x-x0,4),(255,255,0),1); cv2.putText(c,str(x),(x-x0+1,14),0,0.35,(255,255,0),1) if x%100==0 else None
    for y in range((y0//50+1)*50,y1,50): cv2.putText(c,str(y),(1,y-y0),0,0.35,(255,255,0),1) if y%100==0 else None
    cv2.putText(c,re.search(r'at-([\d.]+)s',f).group(1),(4,y1-y0-6),0,0.6,(0,255,255),2)
    iou=(ma&mb).sum()/max(1,(ma|mb).sum())
    print(f, 'IoU', round(iou,3))
    rows.append(c)
cv2.imwrite(out,np.vstack(rows) if len(rows)<3 else np.vstack([np.hstack(rows[i:i+2]) for i in range(0,len(rows)-len(rows)%2,2)]))
