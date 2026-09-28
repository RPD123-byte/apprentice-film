# sparse outline (approxPolyDP, eps px) of the class-map component through a seed, inside a box. Measurement aid.
import cv2, numpy as np, sys, json
C=np.load(sys.argv[1]); spec=json.loads(sys.argv[2])
res={}
for name,(classes,box,seed,eps,close) in spec.items():
    m=np.isin(C,classes).astype(np.uint8)*255
    x0,y0,x1,y1=box; mm=np.zeros_like(m); mm[y0:y1,x0:x1]=m[y0:y1,x0:x1]
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(close,close))
    mm=cv2.morphologyEx(mm,cv2.MORPH_CLOSE,k); mm=cv2.morphologyEx(mm,cv2.MORPH_OPEN,k)
    n,lab=cv2.connectedComponents(mm)
    l=lab[seed[1],seed[0]]
    if l==0: print(name,'seed not in mask'); continue
    comp=(lab==l).astype(np.uint8)*255
    cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea)
    p=cv2.approxPolyDP(c,eps,True)[:,0,:]
    res[name]=p.tolist(); print(name,len(p),'area',int(cv2.contourArea(c)))
json.dump(res,open(sys.argv[3],'w'))
