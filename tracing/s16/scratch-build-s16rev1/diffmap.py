import cv2, sys, numpy as np
D='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s16rev1'
rp, n, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
r=cv2.imread(rp).astype(np.float32); s=cv2.imread(f'{D}/src/f{n}.png').astype(np.float32)
rg=r.mean(2); sg=s.mean(2)
for sig in [1,2,4,8]:
    a=cv2.GaussianBlur(rg,(0,0),sig); b=cv2.GaussianBlur(sg,(0,0),sig)
    print(f'sig{sig}: mean|d|={np.mean(np.abs(a-b)):.2f} signed(r-s)={np.mean(a-b):+.2f}', end='  ')
print()
a=cv2.GaussianBlur(rg,(0,0),3); b=cv2.GaussianBlur(sg,(0,0),3)
d=a-b
# block stats 8x4 grid
H,W=d.shape
for j in range(4):
    print(' '.join(f'{np.mean(np.abs(d[j*H//4:(j+1)*H//4, i*W//8:(i+1)*W//8])):5.1f}' for i in range(8)))
vis=np.clip(128+d*6,0,255).astype(np.uint8)
vis=cv2.applyColorMap(vis,cv2.COLORMAP_JET)
cv2.imwrite(out, np.vstack([cv2.resize(vis,(1103,473)), cv2.resize(np.hstack([r,s]).astype(np.uint8),(1103,237))]))
