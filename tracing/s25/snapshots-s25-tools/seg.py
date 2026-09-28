# seg.py: owl silhouette masks from source frames (bright, large, thin cracks removed)
import cv2, numpy as np
SRC='/Users/computer/rootline/apprentice-film/snapshots/s25-src/f%05d.png'
def gray(f): return cv2.imread(SRC%f,0)
def owlmask(f, thr=150, k=9, box=(600,200,1600,946), seed=None):
    g=gray(f)
    m=np.zeros_like(g)
    x0,y0,x1,y1=box
    sub=(g[y0:y1,x0:x1]>thr).astype(np.uint8)
    sub=cv2.morphologyEx(sub,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))
    n,lab,st,cen=cv2.connectedComponentsWithStats(sub)
    if seed is not None:
        i=lab[seed[1]-y0,seed[0]-x0]
    else:
        i=1+np.argmax(st[1:,4])
    comp=(lab==i).astype(np.uint8)
    # fill holes
    ff=comp.copy(); h,w=ff.shape; mm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,mm,(0,0),1)
    comp=comp|(1-ff)
    m[y0:y1,x0:x1]=comp
    return m
def contour(m, eps=1.5):
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea)
    a=cv2.approxPolyDP(c,eps,True).reshape(-1,2)
    return a
