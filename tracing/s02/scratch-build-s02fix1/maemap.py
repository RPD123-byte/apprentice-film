import cv2, numpy as np, sys
k=int(sys.argv[1]); rd=sys.argv[2]; out=sys.argv[3]
S=cv2.imread(f'src/f{k:03d}.png',0).astype(np.float32); R=cv2.imread(f'{rd}/r{k:03d}.png',0).astype(np.float32)
a=cv2.GaussianBlur(S,(0,0),8); b=cv2.GaussianBlur(R,(0,0),8)
d=b-a
print('MAE',np.abs(d).mean().round(2))
H,W=S.shape
for y in range(0,H,100):
    print(f'{y:4d} '+' '.join(f'{d[y:y+100,x:x+100].mean():+4.0f}' for x in range(0,W,100)))
vis=np.clip(128+d*3,0,255).astype(np.uint8)
cv2.imwrite(out,cv2.resize(vis,(1103,473)))
