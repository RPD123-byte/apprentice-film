# reg.py DIR x0 y0 x1 y1 [T1,T2..] : per-frame region metrics of DIR/r-T.png vs the source frame (cached)
#  s6/s2 = blurred MAE, hf = band-pass energy (render/source), hole = % px render<6 where source>14 (graded)
import cv2, glob, re, sys, os, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
cap=None
def src(fi):
    global cap
    p=f'{SP}/{fi}.png'
    if os.path.exists(p): return cv2.imread(p)
    if cap is None: cap=cv2.VideoCapture(V)
    cap.set(cv2.CAP_PROP_POS_FRAMES,fi); ok,f=cap.read(); cv2.imwrite(p,f); return f
def main():
    d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6])
    fs=sorted(glob.glob(d+'/r-*.png'),key=lambda p:float(re.search(r'r-([\d.]+)\.png',p).group(1)))
    if len(sys.argv)>6: want=set(f'{float(t):.2f}' for t in sys.argv[6].split(',')); fs=[f for f in fs if re.search(r'r-([\d.]+)\.png',f).group(1) in want]
    R=[]
    for f in fs:
        t=float(re.search(r'r-([\d.]+)\.png',f).group(1)); fi=round(t*25)
        a=cv2.imread(f,0).astype(np.float32); b=cv2.cvtColor(src(fi),cv2.COLOR_BGR2GRAY).astype(np.float32)
        A=cv2.GaussianBlur(a,(0,0),6)[y0:y1,x0:x1]; B=cv2.GaussianBlur(b,(0,0),6)[y0:y1,x0:x1]
        A2=cv2.GaussianBlur(a,(0,0),2)[y0:y1,x0:x1]; B2=cv2.GaussianBlur(b,(0,0),2)[y0:y1,x0:x1]
        bp=lambda x: np.abs(cv2.GaussianBlur(x,(0,0),1)-cv2.GaussianBlur(x,(0,0),3))[y0:y1,x0:x1].mean()
        ar=a[y0:y1,x0:x1]; br=cv2.GaussianBlur(b,(0,0),3)[y0:y1,x0:x1]
        hole=100*np.mean((cv2.GaussianBlur(a,(0,0),1)[y0:y1,x0:x1]<6)&(br>14))
        r=(t,np.abs(A-B).mean(),np.abs(A2-B2).mean(),bp(a),bp(b),hole,ar.mean(),b[y0:y1,x0:x1].mean())
        R.append(r); print(f"{t:6.2f} s6 {r[1]:5.2f} s2 {r[2]:5.2f} hf {r[3]:4.2f}/{r[4]:4.2f} hole {r[5]:5.2f}% mean {r[6]:5.1f}/{r[7]:5.1f}")
    if R:
        v=np.array(R); print(f"MEAN s6 {v[:,1].mean():.2f} s2 {v[:,2].mean():.2f} hf {v[:,3].mean():.2f}/{v[:,4].mean():.2f} hole {v[:,5].mean():.2f}")
if __name__=='__main__': main()
