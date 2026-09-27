# mae.py <frame.png|dir> : blurred MAE vs source for frame-*-at-Ts.png or r-T.png files
import cv2,numpy as np,glob,re,sys,os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
ps=[]
for a in sys.argv[1:]:
  ps+= sorted(glob.glob(a+'/frame-*.png')+glob.glob(a+'/r-*.png')) if os.path.isdir(a) else [a]
for p in ps:
    m=re.search(r'at-([\d.]+)s',p) or re.search(r'r-([\d.]+)\.png',p)
    t=float(m.group(1))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read()
    r=cv2.imread(p)
    br=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    bs=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    print(os.path.basename(p),t,round(float(np.abs(br-bs).mean()),1),round(float(br.mean()),1),round(float(bs.mean()),1))
