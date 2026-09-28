# pair renders kNN.png with source frames; print MAE; write pair images (render | source) and a sheet
import cv2,numpy as np,sys,glob,os,re
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24fix1/src/f%04d.png'
d=sys.argv[1]; crop=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>=6 else None
fs=sorted(glob.glob(d+'/k*.png'))
tiles=[];tot=[]
for fn in fs:
  k=int(re.search(r'k(\d+)\.png',fn).group(1))
  a=cv2.imread(fn); b=cv2.imread(SRC%(2420+k))
  ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(float); gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(float)
  m1=np.abs(ga-gb).mean()
  sa=cv2.resize(cv2.GaussianBlur(ga,(0,0),8),None,fx=0.25,fy=0.25); sb=cv2.resize(cv2.GaussianBlur(gb,(0,0),8),None,fx=0.25,fy=0.25)
  m8=np.abs(sa-sb).mean(); tot.append((k,m1,m8))
  print('k%d  mae %.1f  mae_s8 %.2f  mean r %.1f s %.1f'%(k,m1,m8,ga.mean(),gb.mean()))
  if crop: x0,y0,x1,y1=crop; a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
  p=np.hstack([a,b]); cv2.putText(p,'k%d render | source'%k,(10,30),0,1,(0,255,255),2)
  cv2.imwrite(d+'/pair-k%02d.jpg'%k,p,[cv2.IMWRITE_JPEG_QUALITY,88]); tiles.append(cv2.resize(p,(1200,int(1200*p.shape[0]/p.shape[1]))))
if tiles:
  cv2.imwrite(d+'/sheet.jpg',np.vstack(tiles[:12]),[cv2.IMWRITE_JPEG_QUALITY,85])
  t=np.array(tot); print('MEAN mae %.2f  s8 %.2f'%(t[:,1].mean(),t[:,2].mean()))
