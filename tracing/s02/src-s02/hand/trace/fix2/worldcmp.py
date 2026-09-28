# compare the drawn pan world (pre-grade, half scale) with the source mosaic (s02-r3-meas/world_pre_half.npy) per cell
import os, sys, base64, numpy as np, cv2
os.environ['ENTRY']='entry_world.js'; sys.argv=[sys.argv[0]]+sys.argv[1:]
from run import Lab
L=Lab(); u=L.js('()=>LAB.world()'); L.close()
im=cv2.imdecode(np.frombuffer(base64.b64decode(u.split(',',1)[1]),np.uint8),cv2.IMREAD_GRAYSCALE).astype(np.float32)
M=np.load('../s02-r3-meas/world_pre_half.npy'); valid=M>0.5
np.save('../s02-fix2-r3/world_render.npy',im)
X0,Y0=-100,-2000; C=50   # cell 100 world px
rb=cv2.GaussianBlur(im,(0,0),4); sb=cv2.GaussianBlur(M,(0,0),4)
print('cols (world x):',' '.join('%5d'%(X0+2*x) for x in range(0,2300,C)))
for y in range(0,1500,C):
    row=[]
    for x in range(0,2300,C):
        v=valid[y:y+C,x:x+C]
        row.append('%+5.0f'%((rb[y:y+C,x:x+C][v]-sb[y:y+C,x:x+C][v]).mean()) if v.mean()>0.5 else '    .')
    print('%5d'%(Y0+2*y),' '.join(row))
v=np.hstack([np.clip(im*3,0,255),np.clip(M*3,0,255)]).astype(np.uint8); cv2.imwrite('../s02-fix2-r3/world_cmp.jpg',cv2.resize(v,None,fx=0.5,fy=0.5))
