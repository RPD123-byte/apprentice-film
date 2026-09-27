import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
r=cv2.imread(sys.argv[1],0).astype(np.float32); t=float(sys.argv[2]); B=int(sys.argv[3]) if len(sys.argv)>3 else 100
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read(); s=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32)
print('render-source block means (x100):')
for y in range(0,946,B):
    print(f'{y:3d} '+' '.join(f'{int(r[y:y+B,x:x+B].mean()-s[y:y+B,x:x+B].mean()):+4d}' for x in range(0,2206,B)))
