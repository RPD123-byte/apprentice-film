import cv2, numpy as np, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
D=os.path.dirname(os.path.abspath(__file__))+'/srcf'
os.makedirs(D,exist_ok=True)
def ensure(k0,k1):
    need=[k for k in range(k0,k1+1) if not os.path.exists(f'{D}/{k}.png')]
    if not need: return
    c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES, max(0,k0-30))
    # verify position by reading sequentially from 0 is slow; use msec seek then read and use POS_FRAMES
    k=int(c.get(cv2.CAP_PROP_POS_FRAMES))
    while k<=k1:
        ok,f=c.read()
        if not ok: break
        if k>=k0: cv2.imwrite(f'{D}/{k}.png',f)
        k+=1
def get(k):
    ensure(k,k)
    return cv2.imread(f'{D}/{k}.png')
if __name__=='__main__':
    ensure(560,690)
