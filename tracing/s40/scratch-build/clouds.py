import cv2, numpy as np
from skimage.morphology import skeletonize
from skimage.measure import label, regionprops
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),1.0)
B,G,R=b[...,0],b[...,1],b[...,2]
cream=(G>120)&(B>95)&(R-B<95)
# cloud region: cream connected to the bottom rows
lab=label(cream)
bottom=set(np.unique(lab[-3:,:]))-{0}
cl=np.isin(lab,list(bottom))
cl=cv2.morphologyEx(cl.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
region=cv2.dilate(cl,np.ones((15,15),np.uint8))>0
dark=(R<175)&(G<110)&(B<100)&region
dark=cv2.morphologyEx(dark.astype(np.uint8),cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
# silhouette top per column: first cloud (cream or keyline) pixel from the top that belongs to the bottom-connected mass
mass=cv2.morphologyEx(((cl>0)|(dark>0)).astype(np.uint8),cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
tops=[]
for x in range(0,2206,25):
    col=np.where(mass[:,x]>0)[0]
    col=col[col>450]
    tops.append((x,int(col.min()) if len(col) else -1))
print('silhouette tops', tops)
cv2.imwrite(SP+'/cl_dark.png',(dark*255).astype(np.uint8))
sk=skeletonize(dark>0)
np.save(SP+'/cl_sk.npy',sk)
vis=np.zeros_like(f); vis[mass>0]=(60,60,60); vis[sk]=(255,255,255)
cv2.imwrite(SP+'/cl_sk.jpg',cv2.resize(vis[450:,:],None,fx=0.5,fy=0.5))
