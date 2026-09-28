import cv2, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
for t in sys.argv[2:]:
    i=int(round(float(t)*25)); c.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=c.read()
    cv2.imwrite(f'{sys.argv[1]}/{float(t):.2f}.png',f)
