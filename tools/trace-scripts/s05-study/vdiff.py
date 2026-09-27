# vdiff.py DIR IDX out.jpg : blurred-luminance comparison (render - source), grid of means in 100px cells + heat map
import cv2, numpy as np, sys, glob
d,idx,out=sys.argv[1],sys.argv[2],sys.argv[3]
fr=cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]); rf=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0])
a=cv2.GaussianBlur(cv2.cvtColor(fr,cv2.COLOR_BGR2GRAY).astype(float),(0,0),12)
b=cv2.GaussianBlur(cv2.cvtColor(rf,cv2.COLOR_BGR2GRAY).astype(float),(0,0),12)
dd=a-b
print('MAE %.1f  mean render %.1f source %.1f'%(np.abs(dd).mean(),a.mean(),b.mean()))
H,W=dd.shape
for y in range(0,H,100):
    print('%3d '%y+' '.join('%+4d'%int(dd[y:y+100,x:x+100].mean()) for x in range(0,W,100)))
hm=np.clip(128+dd*2,0,255).astype(np.uint8); hm=cv2.applyColorMap(hm,cv2.COLORMAP_JET)
g=cv2.cvtColor(cv2.cvtColor(rf,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)
cv2.imwrite(out,cv2.resize(cv2.addWeighted(hm,0.6,g,0.4,0),(1103,473)))
