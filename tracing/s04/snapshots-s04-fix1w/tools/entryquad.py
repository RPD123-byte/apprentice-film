# entryquad.py : the laptop page quad at 22.48 and 22.44 (source frames 562, 561), measured by an ECC affine of the
# visible page sliver from the measured 22.52 quad (frame 563) backwards; check: 22.56 -> 22.52 against its measured quad
import cv2,numpy as np
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
Q={563:[[-290.8,617.7],[29.9,391.1],[224.1,874.6],[-77.3,1164.4]],564:[[-279.9,564.6],[115.2,358.5],[294.5,823.6],[-58.4,1116.7]]}
def G(fi): return cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{SP}/{fi}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
def track(fa, qa, fb, tx, ty):
    A=G(fa); B=G(fb)
    m=np.zeros(A.shape,np.uint8); cv2.fillPoly(m,[np.array(qa,np.int32)],255); m=cv2.erode(m,np.ones((9,9),np.uint8))
    cc,Wm=cv2.findTransformECC(A,B,np.array([[1,0,tx],[0,1,ty]],np.float32),cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-6),m,5)
    return cc,cv2.transform(np.array([qa],np.float32),Wm)[0]
print('check', track(564,Q[564],563,-60,40))
cc,q2=track(563,Q[563],562,-40,30); print('22.48',cc,np.round(q2,1).tolist())
cc,q1=track(562,q2.tolist(),561,-30,20); print('22.44',cc,np.round(q1,1).tolist())
