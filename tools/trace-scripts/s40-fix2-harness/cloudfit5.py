import numpy as np,cv2,json
A=np.load('Amap.npy'); lay=np.load('lay.npy'); ok=np.load('ok.npy'); pre=np.load('pre138.npy')
H,W=lay.shape; yy,xx=np.mgrid[0:H,0:W]
w=ok.astype(np.float32); Ab=cv2.GaussianBlur(np.where(ok,A,0).astype(np.float32),(0,0),3)/(cv2.GaussianBlur(w,(0,0),3)+1e-6)
TH=0.27
out=[]; tanmask_all=np.zeros((H,W),np.uint8); circ_img=np.zeros((H,W),np.uint8)
disk=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
for i in range(9):
    L=(lay==i).astype(np.uint8)
    m=((Ab>TH)&ok&(lay==i)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,disk(3)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,disk(4))
    m=cv2.dilate(m,disk(3))&L
    tanmask_all|=m
    # pad so regions touching the frame edge can have circles centred outside it
    P=60; mp=cv2.copyMakeBorder(m,P,P,P,P,cv2.BORDER_REPLICATE)
    dt=cv2.distanceTransform(mp,cv2.DIST_L2,5)
    unc=mp.copy(); circles=[]
    tot=mp.sum()
    while len(circles)<22:
        cand=np.where(unc>0,dt,0)
        k=np.argmax(cand); cy,cx=divmod(k,cand.shape[1]); r=cand[cy,cx]
        if r<5 or unc.sum()<0.03*tot: break
        circles.append([int(cx-P),int(cy-P),round(float(r)+1.5,1)])
        cv2.circle(unc,(cx,cy),int(r+1.5),0,-1)
    cm=np.zeros((H,W),np.uint8)
    for x,y,r in circles: cv2.circle(cm,(x,y),int(round(r)),1,-1)
    cm&=L; circ_img|=cm
    inter=(cm&m).sum(); uni=(cm|m).sum()
    # levels
    vis=ok&(lay==i)
    cream=float(np.median(Ab[vis&(cm==0)])) if (vis&(cm==0)).sum()>50 else 0.13
    tp=vis&(cm>0)
    if tp.sum()>100:
        M=np.c_[np.ones(tp.sum()),(xx[tp]-1103)/1103.0,(yy[tp]-473)/473.0]; c,*_=np.linalg.lstsq(M,Ab[tp],rcond=None)
    else: c=np.array([0.4,0,0])
    out.append({'cream':round(cream,3),'tan':[round(float(v),3) for v in c],'circles':circles})
    print(i,'circles',len(circles),'IoU %.2f'%(inter/max(1,uni)),'cream %.3f'%cream,'tan',np.round(c,3))
json.dump(out,open('cloudfit5.json','w'))
# preview model
model=np.full((H,W),np.nan,np.float32)
for i,o in enumerate(out):
    mm=lay==i
    cm=np.zeros((H,W),np.float32)
    for x,y,r in o['circles']: cv2.circle(cm,(x,y),int(round(r)),1.0,-1)
    cm=cv2.GaussianBlur(cm,(0,0),3.5)
    tl=o['tan'][0]+o['tan'][1]*(xx-1103)/1103.0+o['tan'][2]*(yy-473)/473.0
    v=o['cream']+cm*(tl-o['cream'])
    model[mm]=v[mm]
np.save('model5.npy',model)
def cmap(a,m):
  v=np.clip(np.nan_to_num(a)*255/0.8,0,255).astype(np.uint8); c=cv2.applyColorMap(v,cv2.COLORMAP_JET); c[~m]=0; return c
out_img=np.vstack([cmap(Ab,ok)[560:946],cmap(model,lay>=0)[560:946]])
cv2.imwrite('v-Afit5.jpg',cv2.resize(out_img,None,fx=0.5,fy=0.5))
r=(Ab-model)[ok&(lay>=0)]; print('resid std',np.nanstd(r))
# colour of cream vs tan (pre-grade)
print('pre cream',(pre[ok&(Ab<0.18)].mean(0)*255).round(),'pre tan',(pre[ok&(Ab>0.4)&(Ab<0.55)].mean(0)*255).round(),'dark tan',(pre[ok&(Ab>0.58)].mean(0)*255).round())
