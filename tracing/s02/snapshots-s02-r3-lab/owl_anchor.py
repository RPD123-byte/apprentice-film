import sys, json
sys.argv=['x']; 
from run import Lab
import cv2, numpy as np
L=Lab()
def anchors(cfg):
    L.js('(c)=>{window.OWLCFG=Object.assign({},LAB.owlPose(c.name),c.place)}', cfg)
    img,ms=L.frame(100/25)
    a=L.js('()=>window.LASTA')
    return img,a
img,a=anchors({'name':'perch','place':{'x':1000,'y':500,'s':1}})
print(json.dumps({k:a[k] for k in ['root','head','beak','eyes','feet','bbox']}))
cv2.imwrite('../s02-r3-owltest/perch1.png',img)
L.close()
