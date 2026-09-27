import cv2,numpy as np,sys
r=cv2.imread(sys.argv[1],0).astype(np.float32)/255; n=int(round(float(sys.argv[2])*25))
s=cv2.imread('../s20-rev1-src/n%d.png'%n,0).astype(np.float32)/255
for y0 in range(0,946,190):
  row=[]
  for x0 in range(0,2206,220):
    p=s[y0:y0+190,x0:x0+220]; q=r[y0:y0+190,x0:x0+220]
    if p.std()<0.05: row.append('    .     '); continue
    w=np.eye(2,3,dtype=np.float32)
    try:
      cc,w=cv2.findTransformECC(p,q,w,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-5),None,5)
      row.append('%4.1f,%4.1f%s'%(w[0,2],w[1,2],'*' if cc<0.8 else ' '))
    except Exception: row.append('   err    ')
  print('y%3d '%y0+' '.join(row))
