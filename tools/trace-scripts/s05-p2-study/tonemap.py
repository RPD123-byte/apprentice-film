import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames
S=frames.static_target().mean(2).astype(np.float32)
H,W=S.shape
# oriented band-pass: Gabor filters at period 2.95 px, angles 45 and 135 deg
def gabor(theta, lam=2.95, sigma=1.6):
    k=cv2.getGaborKernel((15,15),sigma,np.radians(theta),lam,1.0,0,ktype=cv2.CV_32F); k-=k.mean(); k/=np.abs(k).sum()
    return k
E={}
for th in (45,135,0,90):
    r=cv2.filter2D(S,-1,gabor(th)); E[th]=cv2.GaussianBlur(r*r,(0,0),10)
tone=np.sqrt(np.maximum(0,(E[45]+E[135])-(E[0]+E[90])*0.5))
print(np.percentile(tone,[50,75,90,95,99])*255)
v=np.clip(tone*255*20,0,255).astype(np.uint8)
cv2.imwrite('tonemap.jpg',v[::2,::2]); np.save('cache/tonemap.npy',tone)
