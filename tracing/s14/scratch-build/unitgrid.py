# unitgrid.py out.jpg t:hx:top:s ... [--src dir] : owl frames resampled to units (origin headX,top), 2 px/unit, grid 50u
import cv2, numpy as np, sys, glob, re
out=sys.argv[1]; args=[a for a in sys.argv[2:] if not a.startswith('--')]
src=None
if '--src' in sys.argv: src=sys.argv[sys.argv.index('--src')+1]; args=[a for a in args if a!=src]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
tiles=[]
for a in args:
    t,hx,top,s=map(float,a.split(':'))
    if src:
        fs=glob.glob(src+f'/frame-*-at-{t:g}s.png'); f=cv2.imread(fs[0])
    else:
        c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    full=np.float32([[s/2,0,hx-200*s],[0,s/2,top-40*s]])
    o=cv2.warpAffine(f,full,(800,680),flags=cv2.WARP_INVERSE_MAP|cv2.INTER_CUBIC)
    for u in range(-200,201,50):
        X=(u+200)*2; cv2.line(o,(X,0),(X,680),(0,160,255),1); cv2.putText(o,str(u),(X+2,12),0,0.4,(0,255,255),1)
    for v in range(0,301,50):
        Y=(v+40)*2; cv2.line(o,(0,Y),(800,Y),(0,160,255),1); cv2.putText(o,str(v),(2,Y-2),0,0.4,(0,255,255),1)
    cv2.putText(o,f'{t:.2f}',(700,20),0,0.6,(0,255,0),2)
    tiles.append(o)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),[cv2.IMWRITE_JPEG_QUALITY,85])
