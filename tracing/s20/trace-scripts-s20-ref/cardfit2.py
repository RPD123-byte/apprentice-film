import cv2, numpy as np, sys, json, math
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
t=float(sys.argv[1]); c.set(1,int(round(t*25))); ok,f=c.read()
U=np.float32([[0,0],[465,0],[465,648],[0,648]])
F=np.float32(json.loads(sys.argv[2]))
Hm=cv2.getPerspectiveTransform(U,F)
def P(pts): return cv2.perspectiveTransform(np.float32(pts).reshape(-1,1,2),Hm).reshape(-1,2)
R=45; out=[]
for cx,cy,a0 in [(465-R,R,-90),(465-R,648-R,0),(R,648-R,90),(R,R,180)]:
    for k in range(10): a=math.radians(a0+k*10); out.append([cx+R*math.cos(a),cy+R*math.sin(a)])
cv2.polylines(f,[P(out).astype(np.int32)],True,(0,0,255),1)
area=[[51,160],[423,160],[423,600.5],[51,600.5]]
cv2.polylines(f,[P(area).astype(np.int32)],True,(0,255,0),1)
for a,b in [([51,532.5],[423,532.5]),([237,532.5],[237,600.5])]:
    p=P([a,b]); cv2.line(f,tuple(map(int,p[0])),tuple(map(int,p[1])),(0,255,0),1)
for q in [[196,80],[295,80],[85,210],[142.5,566]]:
    sm=P([q])[0]; cv2.circle(f,(int(sm[0]),int(sm[1])),3,(255,0,255),-1)
print('smiley',P([[196,80]]).round(1).tolist(),'text',P([[85,210]]).round(1).tolist())
x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>4 else (1180,180,1560,860)
cv2.imwrite(sys.argv[3],cv2.resize(f[y0:y1,x0:x1],None,fx=2,fy=2))
