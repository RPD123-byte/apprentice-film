import cv2, numpy as np
from scipy import ndimage
# fly phase (96.0-97.08): frames with a crisp owl vs pure streak / smear frames (read off the source frames)
CRISP=set(list(range(2399,2408))+[2409,2410,2412,2413,2414,2415,2417,2418,2420,2421,2422,2423])
def owl_region(F, m, bright=0.8, minA=700, grow=45):
    """the crisp owl: the largest bright compact body in the foreground, grown to take in its dark details and the
    scissors it holds"""
    Y=cv2.GaussianBlur(F.mean(-1),(0,0),1.0)
    B=((Y>bright)&(m>0)).astype(np.uint8)
    B=cv2.morphologyEx(B,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    n,cc,st,_=cv2.connectedComponentsWithStats(B,connectivity=8)
    if n<=1: return np.zeros_like(B)
    i=1+int(np.argmax(st[1:,4]))
    if st[i,4]<minA: return np.zeros_like(B)
    O=(cc==i).astype(np.uint8)
    O=cv2.dilate(O,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(grow,grow)))
    O=cv2.morphologyEx(O,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
    O=ndimage.binary_fill_holes(O).astype(np.uint8)
    return O&(m>0).astype(np.uint8)
