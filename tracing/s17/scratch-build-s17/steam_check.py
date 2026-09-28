import json,re,cv2,numpy as np,sys
js=open(sys.argv[1]).read(); data=json.loads(js[js.index('{'):js.rindex('}')+1])
c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
X0,Y0,X1,Y1=795,325,905,472; S=3
tiles=[]
for t in sys.argv[3].split(','):
    c.set(1,round(float(t)*25)); ok,f=c.read(); src=cv2.resize(f[Y0:Y1,X0:X1],None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    img=np.zeros_like(src)
    for st in data[t]:
        p=np.array(st).reshape(-1,4)
        for a,b in zip(p[:-1],p[1:]):
            v=int(255*b[3]); w=max(1,int(round((a[2]+b[2])/2*S)))
            cv2.line(img,(int((a[0]-X0)*S),int((a[1]-Y0)*S)),(int((b[0]-X0)*S),int((b[1]-Y0)*S)),(v,v,v),w,cv2.LINE_AA)
    t_=np.hstack([img,src]); cv2.putText(t_,t,(4,16),0,0.5,(0,255,255),1); tiles.append(t_)
n=len(tiles); h=(n+4)//5
while len(tiles)%5: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+5]) for i in range(0,len(tiles),5)]
cv2.imwrite(sys.argv[2],np.vstack(rows))
