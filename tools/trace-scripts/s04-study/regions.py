# Measure value regions of a SOURCE frame as simplified polygons (coordinates only):
#   regions.py T out_prefix [lo hi blur eps minarea]
# writes out_prefix.json (list of polygons with area) and out_prefix.jpg (the frame with numbered outlines).
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); pre=sys.argv[2]
lo=float(sys.argv[3]) if len(sys.argv)>3 else 0; hi=float(sys.argv[4]) if len(sys.argv)>4 else 40
bl=float(sys.argv[5]) if len(sys.argv)>5 else 4; eps=float(sys.argv[6]) if len(sys.argv)>6 else 4; mina=float(sys.argv[7]) if len(sys.argv)>7 else 2000
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),bl)
m=((g>=lo)&(g<=hi)).astype(np.uint8)*255
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
out=[]; vis=(f*0.5).astype(np.uint8)
for k,cn in enumerate(sorted(cs,key=cv2.contourArea,reverse=True)):
    a=cv2.contourArea(cn)
    if a<mina: continue
    p=cv2.approxPolyDP(cn,eps,True).reshape(-1,2)
    out.append({'i':len(out),'area':int(a),'n':len(p),'pts':p.tolist()})
    cv2.polylines(vis,[p.reshape(-1,1,2)],True,(0,255,255),2)
    x,y=p[0]; cv2.putText(vis,str(len(out)-1),(int(x),int(y)),0,1.2,(0,0,255),3)
json.dump(out,open(pre+'.json','w')); cv2.imwrite(pre+'.jpg',cv2.resize(vis,(1103,473)),[cv2.IMWRITE_JPEG_QUALITY,80])
for o in out: print(o['i'],o['area'],o['n'])
