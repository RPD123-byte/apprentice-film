# usage: edges.py dir idx out [x0 y0 x1 y1]  -> render edges red, source edges cyan, over dim source grey; grid every 100px
import cv2, glob, sys, numpy as np
d, idx, out = sys.argv[1], sys.argv[2], sys.argv[3]
fr = cv2.imread(glob.glob(f"{d}/frame-{idx}-*.png")[0]); rf = cv2.imread(glob.glob(f"{d}/ref-{idx}-*.png")[0])
def ed(im):
    g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),(0,0),1.6)
    return cv2.Canny(g,30,80)>0
er,es=ed(fr),ed(rf)
base=(cv2.cvtColor(rf,cv2.COLOR_BGR2GRAY)*0.25).astype(np.uint8)
im=cv2.merge([base,base,base])
im[es]=(255,255,0); im[er]=(0,0,255); im[er&es]=(255,255,255)
for x in range(0,im.shape[1],100): cv2.line(im,(x,0),(x,im.shape[0]),(0,90,0),1); cv2.putText(im,str(x),(x+2,12),0,0.4,(0,200,0),1)
for y in range(0,im.shape[0],100): cv2.line(im,(0,y),(im.shape[1],y),(0,90,0),1); cv2.putText(im,str(y),(2,y+12),0,0.4,(0,200,0),1)
if len(sys.argv)>=8:
    x0,y0,x1,y1=map(int,sys.argv[4:8]); im=im[y0:y1,x0:x1]
mw=1900
if im.shape[1]>mw: im=cv2.resize(im,(mw,int(im.shape[0]*mw/im.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
