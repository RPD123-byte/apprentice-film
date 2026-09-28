import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames,glob
S=frames.static_target().mean(2).astype(np.float32)
R=cv2.imread(glob.glob('../s05-p2-proj/outu/frame-*.png')[0]).astype(np.float32).mean(2)/255
def gabor(theta, lam=2.95, sigma=1.6):
    k=cv2.getGaborKernel((15,15),sigma,np.radians(theta),lam,1.0,0,ktype=cv2.CV_32F); k-=k.mean(); k/=np.abs(k).sum()
    return k
res=S-R
E={th: cv2.GaussianBlur(cv2.filter2D(res,-1,gabor(th))**2,(0,0),12) for th in (45,135,0,90)}
Er={th: cv2.GaussianBlur(cv2.filter2D(R,-1,gabor(th))**2,(0,0),12) for th in (45,135)}
tone=np.sqrt(np.maximum(0,(E[45]+E[135])-(E[0]+E[90])))
print(np.percentile(tone,[50,75,90,95,99])*255)
cv2.imwrite('tonemap2.jpg',np.clip(tone*255*25,0,255).astype(np.uint8)[::2,::2]); np.save('cache/tonemap2.npy',tone)
