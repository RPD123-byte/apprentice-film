import cv2,numpy as np,sys
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s17f/'
a=cv2.imread(sys.argv[1],0).astype(np.float32); n=int(sys.argv[2]) if len(sys.argv)>2 else 1250
b=cv2.imread(S+'src/f%04d.png'%n,0).astype(np.float32)
ba=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6); d=ba-bb
print('MAE %.2f'%np.abs(d).mean())
G=100; H,W=a.shape
print('signed (render-src)')
for y in range(0,H,G): print('%4d '%y+' '.join('%4d'%d[y:y+G,x:x+G].mean() for x in range(0,W,G)))
print('abs')
for y in range(0,H,G): print('%4d '%y+' '.join('%4d'%np.abs(d[y:y+G,x:x+G]).mean() for x in range(0,W,G)))
# heat image
h=np.clip(np.abs(d)*4,0,255).astype(np.uint8)
cv2.imwrite(sys.argv[3] if len(sys.argv)>3 else S+'err.jpg',cv2.resize(cv2.applyColorMap(h,cv2.COLORMAP_INFERNO),None,fx=0.5,fy=0.5))
