# warp_poly.py -- carry hull_fig polygons from a traced time to new times with forward DIS flow (chained per frame)
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap=cv2.VideoCapture(V)
def fr(i): cap.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=cap.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
m=json.load(open('tr/masks.json'))
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
for src,dst in [(a,b) for a,b in [x.split(':') for x in sys.argv[1:]]]:
    P=np.array(m[src]['hull_fig'],np.float32)
    a=int(round(float(src)*25)); b=int(round(float(dst)*25)); st=1 if b>a else -1
    for f in range(a,b,st):
        A=fr(f); B=fr(f+st); fl=cv2.GaussianBlur(dis.calc(A,B,None),(0,0),12)
        xi=np.clip(P[:,0],0,2205).astype(int); yi=np.clip(P[:,1],0,945).astype(int)
        inside=(P[:,0]>=0)&(P[:,0]<2206)&(P[:,1]>=0)&(P[:,1]<946)
        P[inside]+=fl[yi[inside],xi[inside]]
    m[dst]['hull_fig']=np.round(P).astype(int).tolist()
    print(src,'->',dst)
json.dump(m,open('tr/masks.json','w'),indent=1)
