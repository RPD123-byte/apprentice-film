import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def load(p,name):
    s=open(p).read(); j=s[s.index(name+' = ')+len(name)+3:s.rindex(';')]; return json.loads(j)
old=load('/Users/computer/rootline/apprentice-film/src/shots/s17/sil_data.js','SIL')
new=load(sys.argv[1],'SIL')
cap=cv2.VideoCapture(V); tiles=[]
x0,y0,x1,y1=[int(v) for v in sys.argv[4].split(',')] if len(sys.argv)>4 else (360,300,900,580)
for t in sys.argv[2].split(','):
    cap.set(1,round(float(t)*25)); ok,f=cap.read(); k=2
    a=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
    for D,col in ((old,(0,0,255)),(new,(0,255,0))):
        for P in D.get(t,[]):
            pts=np.array(P).reshape(-1,2); pts=((pts-[x0,y0])*k).astype(np.int32)
            cv2.polylines(a,[pts],True,col,1)
    cv2.putText(a,t,(10,30),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,255,255),2); tiles.append(a)
cv2.imwrite(sys.argv[3],np.vstack(tiles),[cv2.IMWRITE_JPEG_QUALITY,88])
