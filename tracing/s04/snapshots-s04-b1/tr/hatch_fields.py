# hatch_fields.py T out.json [owl_x owl_y | none] [debug.jpg]
# Measures, on one source frame (in paint values: the film's grade inverted), the coarse fields that drive s04's
# procedural pen hatching (s04/penhatch.js):
#   mask : where the figure is hatched (dark pen strokes on a lit ground; the owl excluded)
#   th1  : the direction the strokes run; th2 + w2: a second (cross-hatch) direction and its relative strength
#   per  : the stroke spacing (24 px grid)
#   G    : the paper ground under the strokes (value study, 12 px grid)
# Coarse grids only -- no pixels and no stroke positions are stored.
import cv2, numpy as np, sys, json
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s04-b1/tr')
from grade import degrade
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); out=sys.argv[2]
dbg=sys.argv[3] if len(sys.argv)>3 else None
CFG=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-b1/tr/hf_cfg.json')).get(f'{t:.2f}',{})
owl=CFG.get('owl'); EXC=CFG.get('exclude',[])
cap=cv2.VideoCapture(V); cap.set(cv2.CAP_PROP_POS_FRAMES,round(t*25)); ok,f=cap.read()
F=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
P=degrade(F,t).astype(np.float32)
H,W=P.shape
G=cv2.morphologyEx(P,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
G=cv2.GaussianBlur(G,(0,0),3)
# the paper is grainy: its level is the median, not the maximum (the grain below it is not pen work)
Gm=cv2.medianBlur(np.clip(P,0,255).astype(np.uint8),15).astype(np.float32)
G=np.minimum(G,cv2.GaussianBlur(Gm,(0,0),3)+3)
R=np.clip(G-P,0,255)
NA=24; ang=np.arange(NA)*np.pi/NA
Pb=cv2.GaussianBlur(P,(0,0),1.2)
Pxx=cv2.Sobel(Pb,cv2.CV_32F,2,0,ksize=3); Pyy=cv2.Sobel(Pb,cv2.CV_32F,0,2,ksize=3); Pxy=cv2.Sobel(Pb,cv2.CV_32F,1,1,ksize=3)
E=[]
for a in ang:
    nx,ny=-np.sin(a),np.cos(a)
    d2=Pxx*nx*nx+2*Pxy*nx*ny+Pyy*ny*ny
    E.append(cv2.GaussianBlur(np.clip(d2,0,None),(0,0),8))
E=np.array(E)
S=12; nx_,ny_=W//S+1,H//S+1
ys=np.clip(np.arange(ny_)*S,0,H-1); xs=np.clip(np.arange(nx_)*S,0,W-1)
Eg=E[:,ys][:,:,xs]
i1=Eg.argmax(0); e1=Eg.max(0); em=Eg.mean(0)
jj,ii=np.mgrid[0:ny_,0:nx_]
a0=Eg[(i1-1)%NA,jj,ii]; a2=Eg[(i1+1)%NA,jj,ii]
den=(a0-2*e1+a2); off=np.where(np.abs(den)>1e-6,0.5*(a0-a2)/den,0)
th1=((i1+np.clip(off,-0.5,0.5))*np.pi/NA)%np.pi
# direction smoothed by its own strength (doubled-angle vectors), so weak / noisy cells follow their strong neighbours
wgt=np.clip(e1-em,0,None)
# strong edges (dark masses: hair, the laptop, contours) must not steer the hatch: cap the weight, drop cells next to dark
darkm=cv2.dilate((cv2.GaussianBlur(P,(0,0),2)<55).astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))[ys][:,xs]
cap=np.percentile(wgt[wgt>0],70) if (wgt>0).any() else 1
wgt=np.minimum(wgt,cap)*np.where(darkm>0,0.05,1)
vx=cv2.GaussianBlur(np.cos(2*th1)*wgt,(0,0),1.6); vy=cv2.GaussianBlur(np.sin(2*th1)*wgt,(0,0),1.6)
th1=(np.arctan2(vy,vx)/2)%np.pi
k=np.arange(NA)[:,None,None]; dist=np.minimum(np.abs(k-i1[None]),NA-np.abs(k-i1[None]))
E2=np.where(dist>=round(35/180*NA),Eg,-1); i2=E2.argmax(0); e2=E2.max(0)
th2=(i2*np.pi/NA)%np.pi
w2=np.clip((e2-em)/np.maximum(e1-em,1e-3),0,1)
Gg=G[ys][:,xs]
# hatch coverage on the source (the fraction of the lit ground the strokes darken, for an ink of INK)
INK=70
Cg=(cv2.GaussianBlur(R,(0,0),5)/np.maximum(G-INK,25))[ys][:,xs]
Rg=cv2.GaussianBlur(R,(0,0),6)[ys][:,xs]
lit=np.clip((Gg-105)/45,0,1)
lines=np.clip((Rg-4)/10,0,1)
lines=cv2.dilate(lines,np.ones((5,5),np.uint8)); lines=cv2.GaussianBlur(lines,(0,0),1.0)
mask=lit*lines
owlm=np.zeros((H,W),np.uint8)
if owl:
    b=(cv2.GaussianBlur(P,(0,0),4)>150).astype(np.uint8)
    n,lab=cv2.connectedComponents(b)
    L=lab[owl[1],owl[0]]
    if L>0:
        owlm=(lab==L).astype(np.uint8)*255
        owlm=cv2.dilate(owlm,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
    om=cv2.resize(owlm.astype(np.float32)/255,(nx_,ny_),interpolation=cv2.INTER_AREA)
    mask=mask*(1-np.clip(om*1.5,0,1))
if EXC:
    ex=np.zeros((H,W),np.uint8)
    for poly in EXC: cv2.fillPoly(ex,[np.array(poly,np.int32)],255)
    ex=cv2.GaussianBlur(ex.astype(np.float32)/255,(0,0),10)
    mask=mask*(1-cv2.resize(ex,(nx_,ny_),interpolation=cv2.INTER_AREA))
# spacing (24 px grid): first autocorrelation peak of the line signal sampled across the strokes (64 x 24 px strip)
S2=24; mx,my=W//S2+1,H//S2+1; per=np.full((my,mx),8.0,np.float32)
us=np.arange(-32,32,dtype=np.float32); vs=np.arange(-12,12,dtype=np.float32)
for j in range(my):
    for i in range(mx):
        x,y=min(i*S2,W-1),min(j*S2,H-1)
        a=th1[min(ny_-1,round(y/S)),min(nx_-1,round(x/S))]; nX,nY,tX,tY=-np.sin(a),np.cos(a),np.cos(a),np.sin(a)
        X=(x+us[None,:]*nX+vs[:,None]*tX).astype(np.float32); Y=(y+us[None,:]*nY+vs[:,None]*tY).astype(np.float32)
        pr=cv2.remap(P,X,Y,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT).mean(0); pr=pr-pr.mean()
        if (pr*pr).sum()<1e-3: continue
        ac=np.correlate(pr,pr,'full')[63:]; ac=ac/ac[0]
        # first local maximum after the first minimum
        m0=1
        while m0<20 and ac[m0+1]<ac[m0]: m0+=1
        if m0>=16: continue
        lag=m0+int(np.argmax(ac[m0:m0+10])); 
        if 3<=lag<=14 and ac[lag]>0.05:
            # sub-sample peak
            y0,y1,y2=ac[lag-1],ac[lag],ac[min(lag+1,len(ac)-1)]; dd=y0-2*y1+y2
            per[j,i]=lag+(0.5*(y0-y2)/dd if abs(dd)>1e-6 else 0)
per=cv2.medianBlur(np.clip(per,4,13).astype(np.float32),3)
res=dict(t=t,S=S,nx=int(nx_),ny=int(ny_),th1=np.round(th1,3).tolist(),th2=np.round(th2,3).tolist(),w2=np.round(w2,2).tolist(),
         mask=np.round(mask,2).tolist(),C=np.round(np.clip(Cg,0,1),2).tolist(),ink=INK,G=np.round(Gg,0).tolist(),S2=S2,mx=int(mx),my=int(my),per=np.round(per,1).tolist())
json.dump(res,open(out,'w'))
print(f't {t} mask cells {100*(mask>0.3).mean():.1f}% median period in mask {np.median(cv2.resize(per,(nx_,ny_))[mask>0.3]) if (mask>0.3).any() else 0:.1f}')
if dbg:
    hue=(th1/np.pi*180).astype(np.uint8); val=(mask*255).astype(np.uint8); sat=np.full_like(hue,255)
    vis=cv2.cvtColor(np.dstack([hue,sat,val]),cv2.COLOR_HSV2BGR); vis=cv2.resize(vis,(W,H),interpolation=cv2.INTER_NEAREST)
    base=cv2.cvtColor(P.astype(np.uint8),cv2.COLOR_GRAY2BGR)
    cv2.imwrite(dbg,cv2.resize(np.vstack([base,cv2.addWeighted(base,0.35,vis,0.8,0)]),None,fx=0.5,fy=0.5))
