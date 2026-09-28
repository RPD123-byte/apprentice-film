# overlay render edges (red) on source (gray) for a region: frame vs ref of given dir/index
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], int(sys.argv[2]); x0,y0,x1,y1 = map(int, sys.argv[3:7]); out=sys.argv[7]
f = glob.glob(f"{d}/frame-{idx:02d}-*.png")[0]; r = f.replace('/frame-','/ref-')
A = cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]; B = cv2.cvtColor(cv2.imread(r),cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]
ea = cv2.Canny(cv2.GaussianBlur(A,(0,0),2.5),40,100)
im = cv2.cvtColor((B*0.8).astype(np.uint8), cv2.COLOR_GRAY2BGR)
im[ea>0] = (0,0,255)
for x in range((x0//50+1)*50, x1, 50):
    cv2.line(im,(x-x0,0),(x-x0,6 if x%100 else 14),(0,255,255),1)
    if x%100==0: cv2.putText(im,str(x),(x-x0+2,24),0,0.45,(0,255,255),1)
for y in range((y0//50+1)*50, y1, 50):
    cv2.line(im,(0,y-y0),(6 if y%100 else 14,y-y0),(0,255,255),1)
    if y%100==0: cv2.putText(im,str(y),(16,y-y0+4),0,0.45,(0,255,255),1)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
