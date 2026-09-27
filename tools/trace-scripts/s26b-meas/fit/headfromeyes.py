# headfromeyes.py poses.json yaw [F0 F1]: set head x,y,r,rot per frame from the tracked irises (lm.json) using the rig's
# face layout (eyes at efx ± 0.515 r, y 0.27 r, efx = 0.5·yaw; the near eye sits 0.05·yaw higher)
import json, sys, math
P=json.load(open(sys.argv[1])); yaw=float(sys.argv[2]); LM=json.load(open('lm.json'))
F0,F1=(int(sys.argv[3]),int(sys.argv[4])) if len(sys.argv)>4 else (0,10**9)
for F in sorted(P,key=int):
    if not (F0<=int(F)<=F1): continue
    e=LM.get(F,{}).get('eyes')
    if not e or e[0] is None or e[1] is None: continue
    (x1,y1),(x2,y2)=e
    d=math.hypot(x2-x1,y2-y1); r=d/1.03
    # eye-local vector between the eyes is (1.03 r, -0.1·yaw·r) -> rotation
    rot=math.atan2(y2-y1,x2-x1)-math.atan2(-0.1*yaw,1.03)
    mx,my=(x1+x2)/2,(y1+y2)/2
    # midpoint in head units: (0.5 yaw, 0.27); centre = mid - R(rot)·that·r
    ox,oy=0.5*yaw*r,0.27*r
    cx=mx-(ox*math.cos(rot)-oy*math.sin(rot)); cy=my-(ox*math.sin(rot)+oy*math.cos(rot))
    P[F]['head'].update({'x':round(cx,1),'y':round(cy,1),'r':round(r,1),'rot':round(rot,4),'yaw':yaw})
json.dump(P,open(sys.argv[1],'w'))
