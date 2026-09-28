import cv2, numpy as np, glob, sys
d,idx,x0,y0,x1,y1,sc,out=sys.argv[1],sys.argv[2],*map(int,sys.argv[3:7]),float(sys.argv[7]),sys.argv[8]
a=cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]); b=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0])
def E(im):
    g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),(0,0),1.5)
    return cv2.Canny(g,20,45)
ea,eb=E(a)[y0:y1,x0:x1],E(b)[y0:y1,x0:x1]
base=(cv2.cvtColor(cv2.cvtColor(b[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)*0.35).astype(np.uint8)
base[eb>0]=(0,255,0); base[ea>0]=(0,0,255); base[(ea>0)&(eb>0)]=(0,255,255)
cv2.imwrite(out,cv2.resize(base,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)); print(out)
