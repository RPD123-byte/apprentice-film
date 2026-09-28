# end-s26-rev2: new | source | dE(sigma2) heat, cropped. usage: hz.py out.jpg x0,y0,x1,y1 scale F1,F2,...
import cv2, numpy as np, sys
SP="/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26r2"
out,box,sc,Fs=sys.argv[1],[int(v) for v in sys.argv[2].split(",")],float(sys.argv[3]),[int(v) for v in sys.argv[4].split(",")]
x0,y0,x1,y1=box; rows=[]
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32)/255,(0,0),2),cv2.COLOR_BGR2LAB)
for F in Fs:
    N=cv2.imread(f"{SP}/new/c{F}.png"); S=cv2.imread(f"{SP}/src/{F}.png")
    d=np.sqrt(((lab(N)-lab(S))**2).sum(-1)); h=cv2.applyColorMap(np.clip(d*255/25,0,255).astype(np.uint8),cv2.COLORMAP_INFERNO)
    t=[cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA) for im in (N,S,h)]
    for im,l in zip(t,("new","src","dE")): cv2.putText(im,f"{l} {F}",(6,22),0,0.6,(0,0,0),4); cv2.putText(im,f"{l} {F}",(6,22),0,0.6,(0,255,255),1)
    sep=np.full((t[0].shape[0],4,3),80,np.uint8); rows.append(np.hstack([t[0],sep,t[1],sep,t[2]]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print("wrote",out)
