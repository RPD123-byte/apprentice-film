import cv2,numpy as np,sys,glob,os
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24rev'
ks=[int(x) for x in sys.argv[1].split(',')]; out=sys.argv[2]; w=int(sys.argv[3]) if len(sys.argv)>3 else 700
rows=[]
for k in ks:
    p=[f for f in glob.glob(f'{S}/rend/k{k:02d}.*')][0]
    r=cv2.imread(p); s=cv2.imread(f'{S}/src/n{2420+k}.jpg')
    h=int(w*946/2206)
    r=cv2.resize(r,(w,h),interpolation=cv2.INTER_AREA); s=cv2.resize(s,(w,h),interpolation=cv2.INTER_AREA)
    cv2.putText(r,f'R k{k}',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,200,255),2); cv2.putText(s,f'S k{k}',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,200,255),2)
    rows.append(np.hstack([r,np.zeros((h,6,3),np.uint8),s]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
