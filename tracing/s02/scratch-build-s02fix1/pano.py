# pano.py out.jpg rdir|src k1,k2,... : paste frames at world coords (world = frame - cam), half res, later frames on top
import sys, re, cv2, numpy as np
out,rd,ks=sys.argv[1],sys.argv[2],[int(v) for v in sys.argv[3].split(',')]
s=open('/Users/computer/rootline/apprentice-film/src/shots/s02/cam.js').read()
C0=int(re.search(r'CAM0 = (\d+)',s).group(1)); arr=list(map(float,re.search(r'CAM = \[(.*?)\]',s,re.S).group(1).split(',')))
def cam(k):
    i=min(len(arr)//2-1,max(0,k-C0)); return (arr[2*i],arr[2*i+1]) if k>=C0 else (0,0)
X0,Y0,X1,Y1=-100,-2000,4500,1000; sc=0.25
P=np.zeros((int((Y1-Y0)*sc),int((X1-X0)*sc),3),np.uint8)
for k in ks:
    im=cv2.imread(f'src/f{k:03d}.png' if rd=='src' else f'{rd}/r{k:03d}.png')
    cx,cy=cam(k); x=int((-cx-X0)*sc); y=int((-cy-Y0)*sc)
    sm=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    h,w=sm.shape[:2]; P[y:y+h,x:x+w]=sm
# world grid every 500
for gx in range(0,X1,500):
    X=int((gx-X0)*sc); cv2.line(P,(X,0),(X,P.shape[0]),(0,0,160),1); cv2.putText(P,str(gx),(X+2,12),0,0.4,(0,200,255),1)
for gy in range(-2000,Y1,500):
    Y=int((gy-Y0)*sc); cv2.line(P,(0,Y),(P.shape[1],Y),(0,0,160),1); cv2.putText(P,str(gy),(2,Y-2),0,0.4,(0,200,255),1)
cv2.imwrite(out,P,[cv2.IMWRITE_JPEG_QUALITY,88]); print(P.shape)
