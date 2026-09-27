import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,pickle,frames
from build import crop, ero
from sim import layer_canvas
S=frames.static_target().mean(2)
lay=pickle.load(open(sys.argv[1],'rb')); T=lay['T'] if 'T' in lay else crop(S,lay['box'])
img,_=layer_canvas(lay); vis=ero(lay['vis'],6)
k=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
n=sum(len(v) for v in lay['strokes'].values())
print(sys.argv[1].split('/')[-1],'strokes',n,'err',[round(float(np.abs(k(img,s)-k(T,s))[vis].mean()*255),2) for s in (0.7,1,2)])
