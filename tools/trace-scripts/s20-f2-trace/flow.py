import sys; sys.path.insert(0,'src/shots/s20/trace')
import composite as C, cv2, numpy as np
na=int(sys.argv[1]); nb=int(sys.argv[2])
a,_=C.load(na); b,_=C.load(nb)
M=60
res=[]
for y0 in range(0,946,120):
  row=[]
  for x0 in range(0,2206,160):
    p=a[M+y0:M+y0+120,M+x0:M+x0+160]; q=b[M+y0:M+y0+120,M+x0:M+x0+160]
    if p.std()<0.04 or q.std()<0.04: row.append('    .     '); continue
    w=np.eye(2,3,dtype=np.float32)
    try:
      cc,w=cv2.findTransformECC(p.astype(np.float32),q.astype(np.float32),w,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-5),None,5)
      row.append('%4.1f,%4.1f%s'%(w[0,2],w[1,2],'*' if cc<0.8 else ' '))
    except Exception as e: row.append('   err    ')
  print('y%3d '%y0+' '.join(row))
