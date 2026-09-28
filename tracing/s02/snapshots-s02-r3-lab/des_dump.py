import sys, base64, cv2, numpy as np
sys.argv=[sys.argv[0]]
import os; os.environ['ENTRY']='entry_des.js'
from run import Lab
L=Lab(); out='../s02-r3-tone'; os.makedirs(out,exist_ok=True)
for f,look in [(160,False),(240,True)]:
    img,_=L.frame(f,False); cv2.imwrite(f'{out}/des{f}.png',img)
    u=L.js('(l)=>LAB.alpha(l)',look); a=cv2.imdecode(np.frombuffer(base64.b64decode(u.split(',',1)[1]),np.uint8),0); cv2.imwrite(f'{out}/alpha{f}.png',a)
L.close()
