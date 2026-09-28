# the flying owl's face on the source (template: eyes + beak of source f462, rotated / scaled per frame from the root
# track), against the flight pose's beak anchor. Prints per frame: source beak, render anchor, difference.
import os, sys, json, cv2, numpy as np
os.environ['ENTRY']='entry_anch.js'; sys.argv=[sys.argv[0]]
from run import Lab
S='../s02-fix1h-src'
L=Lab()
A={f:L.js('(f)=>LAB.anchors(f)',f) for f in range(405,478)}
L.close()
hp=lambda a: a-cv2.GaussianBlur(a,(0,0),5)
ref=hp(cv2.imread(f'{S}/0462.png',0).astype(np.float32))
# template: eyes + beak, source 462; its reference point = the beak tip (1595, 332)
tx0,ty0,tx1,ty1=1512,268,1682,340; BT=(1595.0,332.0)
T0=ref[ty0:ty1,tx0:tx1]; tc=((tx0+tx1)/2,(ty0+ty1)/2)
a462=A[462]; s462=a462['place']['s']; b462=a462['place']['rot']
off=(BT[0]-a462['beak'][0],BT[1]-a462['beak'][1])   # source beak tip - render beak anchor at 462
print('offset at 462',off)
out={}
for f in range(405,478):
    a=A[f]; s=a['place']['s']/s462; rot=a['place']['rot']-b462
    pred=(a['beak'][0]+off[0]*s, a['beak'][1]+off[1]*s)
    im=hp(cv2.imread(f'{S}/{f:04d}.png',0).astype(np.float32))
    best=None
    for ds in (0.92,0.96,1.0,1.04,1.08):
        for dr in (-0.08,-0.04,0,0.04,0.08):
            k=s*ds; r=rot+dr
            M=cv2.getRotationMatrix2D((T0.shape[1]/2,T0.shape[0]/2),-np.degrees(r),k)
            W=int(T0.shape[1]*k*1.25)+4; Hh=int(T0.shape[0]*k*1.6)+4
            M[0,2]+=W/2-T0.shape[1]/2; M[1,2]+=Hh/2-T0.shape[0]/2
            Tw=cv2.warpAffine(T0,M,(W,Hh),borderValue=0)
            mask=cv2.warpAffine(np.ones_like(T0),M,(W,Hh))
            # beak tip in the warped template
            bt=M@np.array([BT[0]-tx0,BT[1]-ty0,1.0])
            sx0=int(pred[0]-bt[0]-70); sy0=int(pred[1]-bt[1]-70)
            sx0=max(0,sx0); sy0=max(0,sy0)
            if sx0<0 or sy0<0 or sx0+W+140>im.shape[1] or sy0+Hh+140>im.shape[0]: continue
            R=im[sy0:sy0+Hh+140,sx0:sx0+W+140]
            res=cv2.matchTemplate(R,Tw.astype(np.float32),cv2.TM_CCOEFF_NORMED)
            _,mv,_,ml=cv2.minMaxLoc(res)
            if best is None or mv>best[0]: best=(mv,sx0+ml[0]+bt[0],sy0+ml[1]+bt[1],ds,dr)
    if best is None: print(f,'no'); continue
    mv,bx,by,ds,dr=best
    out[f]=[bx,by,pred[0],pred[1],ds,dr,mv]
    print(f'{f} src beak ({bx:7.1f},{by:6.1f}) pred ({pred[0]:7.1f},{pred[1]:6.1f}) d ({bx-pred[0]:+6.1f},{by-pred[1]:+6.1f}) ds {ds} dr {dr:+.2f} score {mv:.3f}')
json.dump(out,open('../s02-fix1h-z/facetrack.json','w'))
