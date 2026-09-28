import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,pickle, build
from build import iso_regions, dil
from sim import layer_canvas
k=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
for n in ['owl','desk']:
  lay=pickle.load(open(f'cache/layer_{n}.pkl','rb')); B=lay['base']; ec=lay['ext']; vis=lay['vis']
  for step,eps,sm in [(0.025,0.5,0),(0.025,0.9,0),(0.03,0.9,0),(0.025,0.9,1.0),(0.03,1.2,1.0),(0.035,1.2,1.0)]:
    Bs=cv2.GaussianBlur(B,(0,0),sm) if sm else B
    lv=iso_regions(Bs,dil(ec,5),step,eps)
    L=dict(lay); L['levels']=lv; L['base0']=step/2
    img,_=layer_canvas(L,draw_strokes=False)
    nv=sum(len(r) for _,rr in lv for r in rr)
    print(n,step,eps,sm,'verts',nv,'err',[round(float(np.abs(k(img,s)-k(B,s))[vis].mean()*255),2) for s in (1,2,4)])
