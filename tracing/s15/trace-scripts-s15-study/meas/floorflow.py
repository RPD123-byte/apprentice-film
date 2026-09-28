# vertical flow of the floor near the bottom of frame, away from the owl -> forward speed estimate
import cv2,numpy as np,json,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
owl={round(o[0],2):o for o in json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s15-study/meas/owl.json'))}
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(40.72*25)))
prev=None
for i in range(125):
    t=round(40.72+i*0.04,2)
    ok,f=c.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    small=cv2.resize(g,(1103,473))
    if prev is not None:
        fl=cv2.calcOpticalFlowFarneback(prev,small,None,0.5,4,25,5,7,1.5,0)
        o=owl.get(t)
        ox=o[6]/2 if o and o[1] is not None else 550
        res=[]
        for y0,y1 in [(400,440),(440,473)]:
            m=np.zeros(small.shape,bool); m[y0:y1,:]=True
            m[:, int(ox-110):int(ox+110)]=False
            fy=fl[...,1][m]; fx=fl[...,0][m]
            res.append(f'y{y0*2}-{y1*2}: dy {np.median(fy)*2:6.1f} dx {np.median(fx)*2:6.1f}')
        print(t,' | '.join(res))
    prev=small
