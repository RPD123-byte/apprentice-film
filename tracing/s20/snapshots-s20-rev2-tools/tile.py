# tile.py dir x0 y0 x1 y1 scale out.jpg t1,t2,...  -> rows of [render | source] crops labelled with frame number
import cv2,numpy as np,sys,glob
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); out=sys.argv[7]; ts=sys.argv[8].split(',')
rows=[]
for t in ts:
    p=[q for q in glob.glob(f'{d}/frame-*.png') if abs(float(q.split('-at-')[1][:-5])-float(t))<1e-6][0]; a=cv2.imread(p)[y0:y1,x0:x1]; b=cv2.imread(p.replace('frame-','ref-'))[y0:y1,x0:x1]
    a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    import os; fr=int(round((float(t)+float(os.environ.get("OFF","0.02")))*25))
    for im,l in ((a,'R'),(b,'S')):
        cv2.putText(im,f'{l} {t} fr{fr}',(5,18),cv2.FONT_HERSHEY_SIMPLEX,0.55,(0,255,255),1)
        for X in range((x0//100+1)*100,x1,100): cv2.line(im,(int((X-x0)*sc),0),(int((X-x0)*sc),6),(0,0,255),2)
        for Y in range((y0//100+1)*100,y1,100): cv2.line(im,(0,int((Y-y0)*sc)),(6,int((Y-y0)*sc)),(0,0,255),2)
    rows.append(np.hstack([a,np.full((a.shape[0],4,3),(0,200,0),np.uint8),b]))
cv2.imwrite(out,np.vstack([np.vstack([r,np.full((4,r.shape[1],3),(0,200,0),np.uint8)]) for r in rows]),[cv2.IMWRITE_JPEG_QUALITY,88])
