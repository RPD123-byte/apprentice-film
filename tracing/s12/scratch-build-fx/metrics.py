# metrics.py render.png source.png [name x0 y0 x1 y1 ...]  -> global blurred MAE (s12 convention) + region MAE at sigma 3 and 1
import cv2,sys,numpy as np
r=cv2.imread(sys.argv[1],0).astype(np.float32); s=cv2.imread(sys.argv[2],0).astype(np.float32)
def mae(a,b,sg,box):
    x0,y0,x1,y1=box; A=cv2.GaussianBlur(a,(0,0),sg)[y0:y1,x0:x1]; B=cv2.GaussianBlur(b,(0,0),sg)[y0:y1,x0:x1]; return np.abs(A-B).mean()
B=(640,0,1960,946)
mr=cv2.GaussianBlur(r,(0,0),2)>90; ms=cv2.GaussianBlur(s,(0,0),2)>90
iou=(mr&ms)[0:946,640:1960].sum()/max(1,(mr|ms)[0:946,640:1960].sum())
print('global MAE s12 %.2f  s3 %.2f  IoU %.3f'%(mae(r,s,12,B),mae(r,s,3,B),iou))
a=sys.argv[3:]
for i in range(0,len(a),5):
    n=a[i]; box=tuple(map(int,a[i+1:i+5]))
    x0,y0,x1,y1=box
    print('%-8s s3 %.1f  s1.5 %.1f  mean r %.1f s %.1f'%(n,mae(r,s,3,box),mae(r,s,1.5,box),r[y0:y1,x0:x1].mean(),s[y0:y1,x0:x1].mean()))
