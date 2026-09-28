# pano2.py out.jpg src|rdir ks X0 Y0 X1 Y1 sc [step] : world-coordinate panorama crop with grid
import sys, re, cv2, numpy as np
out,rd=sys.argv[1],sys.argv[2]; ks=[int(v) for v in sys.argv[3].split(',')]
X0,Y0,X1,Y1=map(int,sys.argv[4:8]); sc=float(sys.argv[8]); step=int(sys.argv[9]) if len(sys.argv)>9 and sys.argv[9][0]!="-" else 100
s=open('/Users/computer/rootline/apprentice-film/src/shots/s02/cam.js').read()
C0=int(re.search(r'CAM0 = (\d+)',s).group(1)); arr=list(map(float,re.search(r'CAM = \[(.*?)\]',s,re.S).group(1).split(',')))
def cam(k):
    i=min(len(arr)//2-1,max(0,k-C0)); return (arr[2*i],arr[2*i+1]) if k>=C0 else (0,0)
W=int((X1-X0)*sc); H=int((Y1-Y0)*sc)
P=np.zeros((H,W,3),np.uint8); filled=np.zeros((H,W),bool)
for k in ks:
    im=cv2.imread(f'src/f{k:03d}.png' if rd=='src' else f'{rd}/r{k:03d}.png')
    if im is None: continue
    cx,cy=cam(k)
    # frame pixel (u,v) -> world (u-cx, v-cy) -> pano ((u-cx-X0)*sc, ...)
    M=np.float32([[sc,0,(-cx-X0)*sc],[0,sc,(-cy-Y0)*sc]])
    w=cv2.warpAffine(im,M,(W,H),flags=cv2.INTER_AREA,borderValue=(0,0,0))
    m=cv2.warpAffine(np.ones(im.shape[:2],np.uint8),M,(W,H),flags=cv2.INTER_NEAREST)>0
    m=m&~filled if '--first' in sys.argv else m
    P[m]=w[m]; filled|=m
for gx in range((X0//step+1)*step,X1,step):
    X=int((gx-X0)*sc); cv2.line(P,(X,0),(X,H),(0,0,200) if gx%500==0 else (0,90,150),1); cv2.putText(P,str(gx),(X+2,12),0,0.4,(0,255,255),1)
for gy in range((Y0//step+1)*step,Y1,step):
    Y=int((gy-Y0)*sc); cv2.line(P,(0,Y),(W,Y),(0,0,200) if gy%500==0 else (0,90,150),1); cv2.putText(P,str(gy),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,P,[cv2.IMWRITE_JPEG_QUALITY,88]); print(P.shape)
