# lineE.py dir t1,t2,..: black-hat line energy inside the source's traced silhouette (eroded 9 px), render vs source
import sys,cv2,numpy as np; sys.path.insert(0,'.')
from owlm import mask, gray
K=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
def energy(im,m):
    g=cv2.GaussianBlur(gray(im),(0,0),0.8); bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,K); return float(bh[m].mean()), float((bh[m]>12).mean())
if __name__=="__main__":
  d=sys.argv[1]; ts=[float(x) for x in sys.argv[2].split(',')]
  R=[]
  for t in ts:
    m=mask(t,0); m=cv2.erode(m.astype(np.uint8),np.ones((9,9),np.uint8))>0
    a=energy(cv2.imread(f'{d}/r{t:.2f}.png'),m); b=energy(cv2.imread(f'{d}/s{t:.2f}.png'),m)
    R.append(a[0]/b[0]); print(t,'ren %.2f %.3f | src %.2f %.3f  ratio %.2f'%(a[0],a[1],b[0],b[1],a[0]/b[0]))
  print('mean ratio %.3f'%np.mean(R))
