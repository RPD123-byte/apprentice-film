# Undo shot 1's push-in (similarity about the measured fixed point) and tile the laptop screen every 0.1 s.
import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
T=[0,.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6]; S=[1,1.0197,1.0451,1.0679,1.0909,1.1122,1.1381,1.1604,1.1825,1.1988,1.2081,1.2095,1.2092]
FX,FY=1019.0,163.0
tiles=[]
for i in range(60):
    t=i*0.1; s=float(np.interp(t,T,S))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read()
    M=np.float32([[1/s,0,FX-FX/s],[0,1/s,FY-FY/s]])        # inverse zoom about the fixed point
    g=cv2.warpAffine(f,M,(f.shape[1],f.shape[0]),flags=cv2.INTER_AREA)
    crop=cv2.resize(g[30:300,840:1310],(376,216)); cv2.putText(crop,f"{t:.1f}",(4,16),0,0.5,(0,255,255),1); tiles.append(crop)
rows=[np.hstack(tiles[r*6:(r+1)*6]) for r in range(10)]
cv2.imwrite('ref/screen_strip.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
