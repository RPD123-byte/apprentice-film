import sys, os, json, cv2, numpy as np
os.environ['ENTRY']='entry_owl.js'; sys.argv=[sys.argv[0]]+sys.argv[1:]
VARS=json.loads(open(sys.argv[1]).read())
from run import Lab
L=Lab(); tiles=[]
src=cv2.imread('../s02-r3-src/0375.png')
x0,y0,x1,y1=940,20,1240,360
for v in VARS:
    L.js('(a)=>{const p=LAB.owlPose("perch",a); window.OWLCFG=Object.assign({},p,{x:1090,y:274,s:0.68})}',v)
    img,_=L.frame(375)
    tiles.append(cv2.resize(img[y0:y1,x0:x1],None,fx=1.5,fy=1.5))
L.close()
tiles.append(cv2.resize(src[y0:y1,x0:x1],None,fx=1.5,fy=1.5))
cv2.imwrite('../s02-r3-r46/owlvar2.jpg',np.hstack(tiles))
