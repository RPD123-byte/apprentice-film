import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,pickle, frames
from build import crop
from sim import layer_canvas, stroke_poly
from strokefit import stroke_layers
S=frames.static_target().mean(2)
k=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
for n in sys.argv[1].split(','):
  lay=pickle.load(open(f'cache/layer_{n}.pkl','rb')); box=lay['box']; vis=lay['vis']; T=crop(S,box)
  a,s=stroke_layers(T.shape,lay['strokes'],lay['vals'],lay['wsc'])
  direct=lay['base']*a+s
  img,alpha=layer_canvas(lay)
  lv,_=layer_canvas(lay,draw_strokes=False)
  err=lambda X:[round(float(np.abs(k(X,s_)-k(T,s_))[vis].mean()*255),2) for s_ in (1,2,4)]
  print(n,'direct base+strokes',err(direct),' levels+strokes',err(img),' levels vs base',[round(float(np.abs(k(lv,s_)-k(lay['base'],s_))[vis].mean()*255),2) for s_ in (1,2,4)])
