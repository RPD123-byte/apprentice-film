#!/usr/bin/env python3
# lmk.py out.jpg T1,T2,... [z] [hw] [hh]: SOURCE head crops with s21's probe() landmarks overlaid
# (red ellipse = our cup, green + = our eye, blue + = our beak point, yellow + = head centre, magenta = pivot/rings)
import cv2, sys, json, subprocess, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; ts=sys.argv[2]; z=float(sys.argv[3]) if len(sys.argv)>3 else 6; hw=int(sys.argv[4]) if len(sys.argv)>4 else 45; hh=int(sys.argv[5]) if len(sys.argv)>5 else 38
js=subprocess.run(['node','-e','''
const {probe}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
console.log(JSON.stringify(process.argv[1].split(',').map(Number).map(probe)));''','--input-type=module',ts],capture_output=True,text=True)
if js.returncode: print(js.stderr); sys.exit(1)
P=json.loads(js.stdout); c=cv2.VideoCapture(V); tiles=[]
for p in P:
    t=p['t']; hx,hy=p['head']
    c.set(1,int(round(t*25))); ok,f=c.read()
    f=cv2.copyMakeBorder(f,100,100,100,100,cv2.BORDER_CONSTANT)
    x0,y0=int(hx-hw),int(hy-hh)
    im=cv2.resize(f[y0+100:y0+2*hh+100,x0+100:x0+2*hw+100],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    T=lambda q:(int(round((q[0]-x0)*z)),int(round((q[1]-y0)*z)))
    for x in range((x0//5+1)*5,x0+2*hw,5):
        X=int((x-x0)*z); cv2.line(im,(X,0),(X,10 if x%10 else 18),(0,255,255),1)
        if x%20==0: cv2.putText(im,str(x),(X+1,30),0,0.4,(0,255,255),1)
    for y in range((y0//5+1)*5,y0+2*hh,5):
        Y=int((y-y0)*z); cv2.line(im,(0,Y),(10 if y%10 else 18,Y),(0,255,255),1)
        if y%20==0: cv2.putText(im,str(y),(20,Y+4),0,0.4,(0,255,255),1)
    if 'cup' in p:
        cv2.ellipse(im,T(p['cup']),(int(p['cupR'][0]*z),int(p['cupR'][1]*z)),0,0,360,(0,0,255),1)
        cv2.drawMarker(im,T(p['cup']),(0,0,255),cv2.MARKER_CROSS,10,1)
    cv2.drawMarker(im,T(p['eye']),(0,255,0),cv2.MARKER_CROSS,12,2)
    cv2.drawMarker(im,T(p['beak']),(255,120,0),cv2.MARKER_CROSS,12,2)
    cv2.drawMarker(im,T(p['head']),(0,255,255),cv2.MARKER_CROSS,10,1)
    cv2.drawMarker(im,T(p['pivot']),(255,0,255),cv2.MARKER_CROSS,12,2)
    for rc in p['rings']: cv2.circle(im,T(rc),int(0.15*p['L']*z),(255,0,255),1)
    cv2.putText(im,f'{t:.2f}',(im.shape[1]-70,im.shape[0]-8),0,0.6,(0,255,255),2)
    tiles.append(im)
H=max(t.shape[0] for t in tiles); W=max(t.shape[1] for t in tiles)
tiles=[np.pad(t,((0,H-t.shape[0]+3),(0,W-t.shape[1]+3),(0,0))) for t in tiles]
cols=max(1,min(len(tiles),1500//W))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,90])
