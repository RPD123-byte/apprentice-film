# IoU of sitting-owl variants vs the hold average silhouette (placement search +-10 px)
import sys, os, json, cv2, numpy as np
os.environ['ENTRY']='entry_owl.js'; VARS=json.loads(open(sys.argv[1]).read()); sys.argv=[sys.argv[0]]
from run import Lab
A=np.load('../s02-r3-meas/hold_pre.npy'); B=cv2.GaussianBlur(A,(0,0),1.5)
x0,y0,x1,y1=(930,30,1260,318)
S=(B[y0:y1,x0:x1]>150).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(S,8); k=1+np.argmax(st[1:,4]); S=(lab==k).astype(np.uint8)
S=cv2.morphologyEx(S,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
L=Lab()
base={"headphones":{"r":58,"open":1.0,"cupEl":-0.1}}
for v in VARS:
    L.js('(a)=>{const p=LAB.owlPose("perch",a); window.OWLCFG=Object.assign({},p,{x:1090,y:274,s:0.68})}',{**base,**v})
    img,_=L.frame(375)
    g=cv2.GaussianBlur(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    R=(g>110).astype(np.uint8); n,lab,st,cen=cv2.connectedComponentsWithStats(R,8); k=1+np.argmax(st[1:,4]); R=(lab==k).astype(np.uint8)
    R=cv2.morphologyEx(R,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    best=None
    for dx in range(-10,11,2):
        for dy in range(-10,11,2):
            M=np.roll(np.roll(R,dy,0),dx,1)[y0:y1,x0:x1]
            iou=(M&S).sum()/max(1,(M|S).sum())
            if best is None or iou>best[0]: best=(round(iou,4),dx,dy)
    print(json.dumps(v), best)
L.close()
