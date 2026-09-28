# polyview.py KEY x0 y0 x1 y1 scale -- pose part outlines over the source key frame
import cv2,numpy as np,json,sys
key=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; sc=float(sys.argv[6])
d=json.load(open(f'../s25-meas/pose-{key}.json'))
im=cv2.imread(f'../s25-src/f{d["frame"]:05d}.png')
c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
rng=np.random.RandomState(2)
for p in d['parts']:
    col=tuple(int(v) for v in rng.randint(60,255,3))
    for q in p['polys']:
        q=((np.array(q)-[x0,y0])*sc*8).astype(np.int32)
        cv2.polylines(c,[q],True,col,1,cv2.LINE_AA,shift=3)
    q=np.array(p['polys'][0]); cx,cy=q.mean(0)
    cv2.putText(c,p['name'],(int((cx-x0)*sc),int((cy-y0)*sc)),0,0.45,col,1)
cv2.imwrite(f'../s25-meas/pv-{key}.jpg',c)
