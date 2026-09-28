import cv2, numpy as np
from skimage.morphology import skeletonize
from skimage.measure import label, regionprops
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),1.0)
B,G,R=b[...,0],b[...,1],b[...,2]
cream=((G>115)&(B>90)&(R-B<95)).astype(np.uint8)
cream=cv2.morphologyEx(cream,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
lab=label(cream)
keep=np.zeros_like(cream)
for rp in regionprops(lab):
    cy,cx=rp.centroid
    if rp.area>1500 and cy>560 and rp.bbox[0]>480:
        # skip elongated ribbon stripes: require solidity
        print('comp',rp.label,'area',rp.area,'bbox',rp.bbox,'solidity %.2f'%rp.solidity)
        if rp.solidity>0.6: keep[lab==rp.label]=1
mass=cv2.morphologyEx(keep,cv2.MORPH_CLOSE,np.ones((11,11),np.uint8))
tops=[]
for x in range(0,2206,25):
    col=np.where(mass[:,x]>0)[0]
    tops.append((x,int(col.min()) if len(col) else -1))
print(tops)
np.save(SP+'/cl_mass.npy',mass)
dark=((R<175)&(G<110)&(B<100)&(cv2.dilate(mass,np.ones((15,15),np.uint8))>0)).astype(np.uint8)
sk=skeletonize(dark>0); np.save(SP+'/cl_sk.npy',sk)
vis=cv2.cvtColor(f.astype(np.uint8),cv2.COLOR_BGR2GRAY)//2
vis=cv2.cvtColor(vis,cv2.COLOR_GRAY2BGR); vis[mass>0]=(vis[mass>0]*0.5+np.array([0,80,0])).astype(np.uint8); vis[sk]=(0,0,255)
cv2.imwrite(SP+'/cl_vis.jpg',cv2.resize(vis[500:,:],None,fx=0.5,fy=0.5))
