import cv2,numpy as np,sys
rd=sys.argv[1]; frs=[int(f) for f in sys.argv[2].split(',')]; out=sys.argv[3]
rows=[]
for f in frs:
  a=cv2.imread(f'{rd}/r{f}.png'); b=cv2.imread(f'snapshots/s08-rev1-src/f{f}.png')
  im=np.hstack([a,np.full((946,8,3),(0,0,255),np.uint8),b]); im=cv2.resize(im,None,fx=0.42,fy=0.42,interpolation=cv2.INTER_AREA)
  cv2.putText(im,'%d  %.2fs'%(f,f/25),(10,24),0,0.8,(0,255,255),2)
  rows.append(im)
  la=cv2.GaussianBlur(a.astype(float).mean(-1),(0,0),3); lb=cv2.GaussianBlur(b.astype(float).mean(-1),(0,0),3)
  print(f,'mean luma ren %.1f src %.1f  blurred mad %.2f'%(a.mean(),b.mean(),np.abs(la-lb).mean()))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
