import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
_TR=[l.split() for l in open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/track.txt')]
_TR=[(float(a[0]),float(a[1]),float(a[3]),float(a[4])) for a in _TR]
def cam(t):
    for i in range(1,len(_TR)):
        if t<=_TR[i][0]:
            a,b=_TR[i-1],_TR[i]; u=(t-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*u for k in (1,2,3)]
    return list(_TR[-1][1:])
_cap=cv2.VideoCapture(V)
def frame(t):
    _cap.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=_cap.read(); return f
def plate_frame(t,x0,y0,x1,y1,Z=1,img=None):
    f=frame(t) if img is None else img
    s,tx,ty=cam(t)
    M=np.float32([[s/Z,0,s*x0+tx],[0,s/Z,s*y0+ty]])
    return cv2.warpAffine(f,M,(int((x1-x0)*Z),int((y1-y0)*Z)),flags=cv2.WARP_INVERSE_MAP|cv2.INTER_AREA)
