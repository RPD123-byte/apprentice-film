#!/usr/bin/env python3
# lmksc.py out.jpg T1,.. x0 y0 x1 y1 z : SOURCE crops with s21's scissors pivot (magenta +), ring centres (magenta o),
# blade tips (cyan +) overlaid
import cv2, sys, json, subprocess, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; ts=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7])
js=subprocess.run(['node','--input-type=module','-e','''
const {probe}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
console.log(JSON.stringify(process.argv[1].split(',').map(Number).map(probe)));''',ts],capture_output=True,text=True)
if js.returncode: print(js.stderr); sys.exit(1)
P=json.loads(js.stdout); c=cv2.VideoCapture(V); tiles=[]
for p in P:
    t=p['t']; c.set(1,int(round(t*25))); ok,f=c.read()
    im=cv2.resize(f[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    T=lambda q:(int(round((q[0]-x0)*z)),int(round((q[1]-y0)*z)))
    for x in range((x0//10+1)*10,x1,10):
        X=int((x-x0)*z); cv2.line(im,(X,0),(X,6 if x%50 else 14),(0,255,255),1)
        if x%50==0: cv2.putText(im,str(x),(X+1,26),0,0.4,(0,255,255),1)
    for y in range((y0//10+1)*10,y1,10):
        Y=int((y-y0)*z); cv2.line(im,(0,Y),(6 if y%50 else 14,Y),(0,255,255),1)
        if y%50==0: cv2.putText(im,str(y),(16,Y+4),0,0.4,(0,255,255),1)
    cv2.drawMarker(im,T(p['pivot']),(255,0,255),cv2.MARKER_CROSS,14,2)
    for rc in p['rings']: cv2.circle(im,T(rc),4,(255,0,255),2)
    import math
    a=p['ang']; L=p['L']; o=p['open']
    for s in (1,-1):
        tip=(p['pivot'][0]+math.cos(a+s*o/2)*L,p['pivot'][1]+math.sin(a+s*o/2)*L); cv2.drawMarker(im,T(tip),(255,255,0),cv2.MARKER_CROSS,12,2)
    if 'beakTip' in p: cv2.drawMarker(im,T(p['beakTip']),(0,128,255),cv2.MARKER_TILTED_CROSS,10,2)
    cv2.putText(im,f'{t:.2f}',(im.shape[1]-70,im.shape[0]-8),0,0.6,(0,255,255),2); tiles.append(im)
cols=max(1,min(len(tiles),1800//tiles[0].shape[1]))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
