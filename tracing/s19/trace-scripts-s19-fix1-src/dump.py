import cv2, sys, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; ts=[float(x) for x in sys.argv[2].split(',')]
c=cv2.VideoCapture(V)
for t in ts:
    n=int(round(t*25)); c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read()
    cv2.imwrite(f"{out}/src-{t:.2f}.png",f)
