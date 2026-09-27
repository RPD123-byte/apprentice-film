import sys; sys.path.insert(0,'../s18fix1')
from src import *
bg=np.load('../bgA.npy').astype(np.float32)
cf=lambda f: f-(f-1)//25
ph=lambda f: ['level','up','level','down'][cf(f)%4]
X0,Y0,X1,Y1=420,150,1080,640
def regimg(img,n):
    dx,dy=PATH_A[n]; M=np.float32([[1,0,-dx],[0,1,-dy]])
    return cv2.warpAffine(img,M,(2206,946),borderValue=0)[Y0:Y1,X0:X1]
res={}
for P in ['level','up','down']:
    fs=[f for f in range(1341,1382) if ph(f)==P]
    stack=[]; masks=[]
    for n in fs:
        f=frame(n,True).astype(np.float32)
        d=np.abs(cv2.GaussianBlur(f,(0,0),1.5)-cv2.GaussianBlur(bg,(0,0),1.5))
        stack.append(regimg(f,n)); masks.append(regimg(d,n)>30)
    stack=np.array(stack); masks=np.array(masks)
    med=np.median(stack,0); mm=masks.mean(0)
    np.save(f'owlA_{P}_med.npy',med); np.save(f'owlA_{P}_mask.npy',mm)
    # deviation of each frame from the median inside the consensus mask
    m=mm>0.6
    print(P,len(fs),[f'{n}:{np.abs(s-med)[m].mean():.1f}' for n,s in zip(fs,stack)])
    cv2.imwrite(f'owlA_{P}_med.png',med.astype(np.uint8)); cv2.imwrite(f'owlA_{P}_mask.png',(mm*255).astype(np.uint8))
