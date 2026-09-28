import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np, cv2, pickle, time, frames
from sim import layer_canvas
S=frames.static_target().mean(2)
for name in sys.argv[1].split(','):
  lay=pickle.load(open(f'cache/layer_{name}.pkl','rb')); 
  t0=time.time(); img,alpha=layer_canvas(lay); print('sim',time.time()-t0)
  x0,y0,x1,y1=lay['box']
  from build import crop
  T=crop(S,lay['box']); vis=lay['vis']
  k=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
  for s in (1,2,4):
    d=np.abs(k(img,s)-k(T,s))[vis]; print(name,'sigma',s,'MAE',d.mean()*255)
  c=np.hstack([img*vis+T*(~vis)*0.3, T]); cv2.imwrite(f'sim_{name}.png',np.clip(c*255,0,255).astype(np.uint8))
