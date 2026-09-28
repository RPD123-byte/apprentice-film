import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
def fr(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return f
a=fr(48.76); b=fr(53.12)
bg=b.copy(); bg[:, :620]=a[:, :620]
cv2.imwrite('snapshots/s17-meas/bg.png',bg)
cv2.imwrite('snapshots/s17-meas/bg-crop.jpg',bg[250:640,300:1050])
