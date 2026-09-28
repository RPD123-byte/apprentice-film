import sys, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
scr=np.zeros((946,2206),np.uint8); cv2.fillPoly(scr,[np.array([[315,246],[834,168],[898,519],[409,648]])],1); ns=cv2.dilate(scr,np.ones((41,41)))==0
def st(f):
    L=f.mean(2); m=ns&(L>0.25)&(L<0.75)
    b,g,r=[f[...,c][m].mean()*255 for c in range(3)]
    return g-r,g-b,r-b
def stp(f):
    L=f.mean(2); m=ns&(L>0.2)&(L<0.8)
    b,g,r=[f[...,c][m].sum() for c in range(3)]; s=(b+g+r)/3
    return r/s,g/s,b/s
if __name__=="__main__":
 for k in list(range(576,606))+[610,625,650,667]:
      a=st(frames.frame(k)); p=stp(frames.pre(k))
      print(k, f'{k/25:.2f}', 'graded G-R %.2f G-B %.2f R-B %.2f'%a, '| pre gains r %.4f g %.4f b %.4f'%p)
