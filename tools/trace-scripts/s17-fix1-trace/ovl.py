import cv2, numpy as np, json, re, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def load(p,name):
    s=open(p).read(); j=s[s.index(name+' = ')+len(name)+3:s.rindex(';')]; return json.loads(j)
old=load('/Users/computer/rootline/apprentice-film/src/shots/s17/wing_data.js','WINGS')
new=load(sys.argv[1],sys.argv[2])
cap=cv2.VideoCapture(V); tiles=[]
for t in sys.argv[3].split(','):
    cap.set(1,round(float(t)*25)); ok,f=cap.read()
    x0,y0,x1,y1=540,300,840,560; k=3
    a=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
    for D,col in ((old,(0,0,255)),(new,(0,255,0))):
        for nm,P in D.get(t,{}).items():
            if nm=='M': continue
            pts=np.array(P).reshape(-1,2); pts=((pts-[x0,y0])*k).astype(np.int32)
            cv2.polylines(a,[pts],True,col,1)
    cv2.putText(a,t,(10,30),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,255,255),2); tiles.append(a)
cv2.imwrite(sys.argv[4],np.vstack(tiles),[cv2.IMWRITE_JPEG_QUALITY,88])
