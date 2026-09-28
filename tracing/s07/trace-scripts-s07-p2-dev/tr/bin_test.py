import cv2,numpy as np,sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s07/trace')
from ridge import trace
from raster import render_strokes_over, gblur
T=np.load('../w/T.npy'); g=(T.mean(axis=2)*255).astype(np.float32)
x0,y0,x1,y1=1450,0,1900,300
G=g[y0:y1,x0:x1].copy()
base=gblur(cv2.medianBlur(np.clip(G,0,255).astype(np.uint8),11).astype(np.float32),2)
out=[]
for bins,wm in ((0,0),(8,5)):
  d=trace(G,base,'d',sig=1.2,hi=5,lo=2.5,bins=bins,wmed=wm); b=trace(G,base,'b',sig=1.2,hi=5,lo=2.5,bins=bins,wmed=wm)
  R=render_strokes_over(base,b+d)
  print(bins,len(d)+len(b),'mae2 %.2f mae0 %.2f'%(np.abs(gblur(R,2)-gblur(G,2)).mean(),np.abs(R-G).mean()))
  out.append(R)
im=np.hstack(out+[G]); cv2.imwrite('bins.jpg',cv2.resize(np.clip(im,0,255).astype(np.uint8),None,fx=1.6,fy=1.6,interpolation=cv2.INTER_CUBIC))
