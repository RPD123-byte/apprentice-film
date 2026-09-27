import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames
a=cv2.imread(sys.argv[1]).astype(np.float32)/255
g=cv2.imread(sys.argv[2]).astype(np.float32)/255
S=frames.static_target()
k=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
Y=a.mean(2); T=S.mean(2)
scr=np.zeros(Y.shape,np.uint8); cv2.fillPoly(scr,[np.array([[315,246],[834,168],[898,519],[409,648]])],1); m=cv2.dilate(scr,np.ones((9,9)))==0
print('ungraded vs static target: ',[round(float(np.abs(k(Y,s)-k(T,s))[m].mean()*255),2) for s in (1,2,4)])
src=np.mean([frames.frame(k_) for k_ in (622,623,624,625)],0)
print('graded vs src avg 24.88-25.00:',[round(float(np.abs(k(g.mean(2),s)-k(src.mean(2),s))[m].mean()*255),2) for s in (0.01,1,2,4)])
print('chan means render', (g[m].mean(0)*255).round(2), 'src', (src[m].mean(0)*255).round(2))
