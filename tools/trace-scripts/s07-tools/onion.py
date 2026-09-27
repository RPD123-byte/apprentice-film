# onion overlay: render edges (red) over source (grey) for a region, for alignment checks. usage: onion.py DIR idx x0 y0 x1 y1 [scale]
import cv2, numpy as np, sys, glob
d=sys.argv[1]; idx=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; s=float(sys.argv[7]) if len(sys.argv)>7 else 1.5
fr=glob.glob(f'{d}/frame-{idx}-at-*.png')[0]; rf=fr.replace('/frame-','/ref-')
a=cv2.imread(fr,0)[y0:y1,x0:x1]; b=cv2.imread(rf,0)[y0:y1,x0:x1]
out=np.dstack([b*0.7,b*0.7,b*0.7]).astype(np.float32)
# render as magenta tint where render is bright and source dark, green where source bright and render dark
ab=cv2.GaussianBlur(a.astype(np.float32),(0,0),2); bb=cv2.GaussianBlur(b.astype(np.float32),(0,0),2)
diff=ab-bb
out[...,2]+=np.clip(diff,0,255)*0.8   # render brighter -> red
out[...,1]+=np.clip(-diff,0,255)*0.8  # source brighter -> green
out=np.clip(out,0,255).astype(np.uint8)
for x in range((x0//50+1)*50,x1,50): cv2.line(out,(x-x0,0),(x-x0,y1-y0),(255,200,0),1)
for y in range((y0//50+1)*50,y1,50): cv2.line(out,(0,y-y0),(x1-x0,y-y0),(255,200,0),1)
out=cv2.resize(out,None,fx=s,fy=s)
for x in range((x0//100+1)*100,x1,100): cv2.putText(out,str(x),(int((x-x0)*s)+2,12),0,0.4,(0,255,255),1)
for y in range((y0//100+1)*100,y1,100): cv2.putText(out,str(y),(2,int((y-y0)*s)-3),0,0.4,(0,255,255),1)
cv2.imwrite(f'{d}/onion-{idx}-{x0}-{y0}.jpg',out); print(f'{d}/onion-{idx}-{x0}-{y0}.jpg')
