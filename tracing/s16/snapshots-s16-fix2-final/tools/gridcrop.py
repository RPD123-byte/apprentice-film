# gridcrop.py out.jpg scale n:x0:y0:x1:y1 ... -> source crops with a 10 px grid (labels every 20), tiled
import sys, cv2, numpy as np, h16
out=sys.argv[1]; s=float(sys.argv[2]); tiles=[]
for spec in sys.argv[3:]:
    n,x0,y0,x1,y1=map(int,spec.split(':'))
    im=cv2.resize(h16.src(n)[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
    for x in range((x0+9)//10*10,x1,10):
        c=(0,0,255) if x%50==0 else (0,120,0)
        cv2.line(im,(int((x-x0)*s),0),(int((x-x0)*s),im.shape[0]),c,1)
        if x%20==0: cv2.putText(im,str(x),(int((x-x0)*s)+2,11),cv2.FONT_HERSHEY_PLAIN,0.8,(0,255,255),1)
    for y in range((y0+9)//10*10,y1,10):
        c=(0,0,255) if y%50==0 else (0,120,0)
        cv2.line(im,(0,int((y-y0)*s)),(im.shape[1],int((y-y0)*s)),c,1)
        if y%20==0: cv2.putText(im,str(y),(2,int((y-y0)*s)-2),cv2.FONT_HERSHEY_PLAIN,0.8,(0,255,255),1)
    cv2.putText(im,str(n),(im.shape[1]-40,im.shape[0]-5),cv2.FONT_HERSHEY_PLAIN,1.2,(255,0,255),2)
    tiles.append(im)
W=max(t.shape[1] for t in tiles); rows=[]
cols=int(sys.argv[0] and 3)
cur=[]
for t in tiles:
    cur.append(np.pad(t,((0,0),(0,W-t.shape[1]),(0,0)))); 
H=max(t.shape[0] for t in cur)
cur=[np.pad(t,((0,H-t.shape[0]),(0,4),(0,0))) for t in cur]
rows=[np.hstack(cur[i:i+cols]+[np.zeros_like(cur[0])]*(cols-len(cur[i:i+cols]))) for i in range(0,len(cur),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
