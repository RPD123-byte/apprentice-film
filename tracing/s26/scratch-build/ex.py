import cv2, numpy as np, glob, re, sys, os
d='snapshots/s26-rev1r-exact'
def lab(x):
    x=cv2.GaussianBlur(x.astype(np.float32)/255,(0,0),8); return cv2.cvtColor(x,cv2.COLOR_BGR2LAB)
rows=[]
for p in sorted(glob.glob(d+'/r*.png')+glob.glob(d+'/s25/r*.png')+glob.glob(d+'/s27/r*.png'),key=lambda p:int(re.search(r'r(\d+)\.png',p).group(1))):
    F=int(re.search(r'r(\d+)\.png',p).group(1))
    a=cv2.imread(p); b=cv2.imread(f'{d}/src/{F}.png')
    if b is None: continue
    de=np.sqrt(((lab(a)-lab(b))**2).sum(2)).mean()
    print(f'{os.path.relpath(p,d):14s} F{F} t={F/25:.2f} dE8={de:5.2f} Y r={cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).mean():5.1f} s={cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).mean():5.1f}')
    im=np.vstack([a,np.full((8,a.shape[1],3),(0,0,255),np.uint8),b]); sc=1500/im.shape[1]
    cv2.imwrite(f'{d}/v{F}{"_"+os.path.dirname(os.path.relpath(p,d)) if os.path.dirname(os.path.relpath(p,d)) else ""}.jpg',cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,88])
