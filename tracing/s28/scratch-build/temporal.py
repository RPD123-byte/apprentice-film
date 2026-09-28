import cv2,numpy as np,glob,re,sys,math
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def src(t):
    cap.set(cv2.CAP_PROP_POS_FRAMES,math.ceil(t*25-1e-6)); ok,f=cap.read(); return f
fs=[]
for d in sys.argv[1:]:
    fs+=glob.glob(d+'/frame-*.jpg')
fs=sorted(fs,key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
prev=None
P=lambda im: cv2.GaussianBlur(cv2.resize(im,(1103,473),interpolation=cv2.INTER_AREA).astype(np.float32),(0,0),2)
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    A=cv2.imread(f); B=src(t); a=P(A); b=P(B)
    e12=np.abs(cv2.GaussianBlur(A.astype(np.float32),(0,0),12)-cv2.GaussianBlur(B.astype(np.float32),(0,0),12)).mean()
    s=f"{t:.2f} s12={e12:.2f}"
    if prev is not None and abs(t-prev[0]-0.04)<0.005:
        dR=np.abs(a-prev[1]).mean(); dS=np.abs(b-prev[2]).mean(); dd=np.abs((a-prev[1])-(b-prev[2])).mean()
        s+=f"   step from {prev[0]:.2f}: |dRender|={dR:5.2f} |dSource|={dS:5.2f}  |dR-dS|={dd:5.2f}"
    print(s)
    prev=(t,a,b)
