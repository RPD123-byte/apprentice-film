# edgeov.py DIR IDX x0 y0 x1 y1 Z out.jpg : render crop (grey) with source edges in red and render edges in cyan
import cv2, numpy as np, sys, glob
d,idx=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; Z=float(sys.argv[7]); out=sys.argv[8]
fr=cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]); rf=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0])
def edges(im):
    g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),(0,0),2.0); return cv2.Canny(g,30,90)
a=fr[y0:y1,x0:x1]; b=rf[y0:y1,x0:x1]
ea,eb=edges(a),edges(b)
base=(cv2.cvtColor(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)*0.55).astype(np.uint8)
base[ea>0]=(255,255,0); base[eb>0]=(0,0,255); base[(ea>0)&(eb>0)]=(255,255,255)
cv2.imwrite(out,cv2.resize(base,None,fx=Z,fy=Z),[cv2.IMWRITE_JPEG_QUALITY,88])
