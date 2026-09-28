import cv2, numpy as np
from skimage.measure import label, regionprops
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),0.8)
B,G,R=b[...,0],b[...,1],b[...,2]
face=((R>205)&(G>195)&(B>180)).astype(np.uint8)
face[:, :470]=0; face[:, 1700:]=0; face[:250]=0; face[640:]=0
face=cv2.morphologyEx(face,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
lab=label(face)
for rp in regionprops(lab):
    if rp.area>500: print(rp.label, rp.area, 'bbox y%d-%d x%d-%d'%(rp.bbox[0],rp.bbox[2],rp.bbox[1],rp.bbox[3]), 'holes', rp.euler_number)
np.save(SP+'/face.npy',face)
# column profiles through selected x
dark=((R<140)&(G<80)).astype(np.uint8)
def colprof(x,y0,y1):
    s=''
    for y in range(y0,y1):
        r,g,bb=R[y,x],G[y,x],B[y,x]
        if r>205 and g>195: c='F'
        elif r<140 and g<80: c='#'
        elif g<60 and r>150: c='r'
        elif g<95 and r>180: c='o'
        else: c='.'
        s+=c
    return s
for x in [540,700,760,1000,1300,1430,1480,1580,1600,1640]:
    print(x, colprof(x,440,640))
