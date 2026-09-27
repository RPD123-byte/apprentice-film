import sys; sys.path.insert(0,'.')
from tipcommon import *
km=kbmask()
Pf={}
for n in range(1417,1433):
    Pf[n]=inverse(frame(n,True).astype(np.float32)/255,n/25)
bgB=np.load('../bgB.npy').astype(np.float32)/255
PbgB=inverse(bgB,56.0)
# ---------------- BG (frame coords)
wingx={1424:520,1425:520,1426:520,1427:520,1428:0,1429:220,1430:220,1431:120,1432:0}
S=[];V=[]
for n in range(1424,1433):
    cov=frame_from_plate(km.astype(np.float32),n)>0.01
    d=95 if n>=1429 else 8
    cov=cv2.dilate(cov.astype(np.uint8),np.ones((2*d+1,2*d+1),np.uint8))>0
    v=~cov; v[:, :wingx[n]]=False
    S.append(Pf[n]); V.append(v)
S=np.array(S); V=np.array(V)
Sm=np.where(V,S,np.nan)
BG=np.nanmedian(Sm,0); nv=V.sum(0)
print('BG valid frac',(nv>0).mean())
# consistency with bgB where both valid and bgB is above the kb
kb_frame=km[:946,M:M+2206]>0
ok=(nv>0)&(~kb_frame)&(np.arange(946)[:,None]<320)&(np.arange(2206)[None,:]>1030)
print('BG vs bgB (above kb, x>1030) mean abs',np.nanmean(np.abs(BG-PbgB)[ok])*255, 'signed',np.nanmean((BG-PbgB)[ok])*255)
# fall back to the pre-tip median (bgB) outside the untipped keyboard, where bgB is not the masked top band
bgok=(~kb_frame)&~((np.arange(946)[:,None]<330)&(np.arange(2206)[None,:]<1030))
late=(np.arange(946)[:,None]>200)&(np.arange(2206)[None,:]>1460)
# right of the panel the pre-tip frames show the background directly (the owl never reaches x > 1960 after 1383):
# use their plain median there, not bgB (whose top band was assembled differently and is off at the striped box)
PmedB=inverse(np.load('medB_raw.npy').astype(np.float32)/255,56.0)
fb=np.where(np.arange(2206)[None,:]>1460,PmedB,PbgB)
BGv=np.where((nv>0)&~late,BG,np.where(bgok,fb,0.0)).astype(np.float32)
np.save('BGB_P.npy',BGv); np.save('BGB_valid.npy',nv>0)
cv2.imwrite('BGB_view.jpg',(np.clip(BGv,0,1)*255).astype(np.uint8))
# ---------------- KB (canvas coords)
KB=np.full((KBH,KBW),np.nan,np.float32)
base=np.full((KBH,KBW),np.nan,np.float32); base[:946,M:M+2206]=PbgB
yy,xx=np.mgrid[0:KBH,0:KBW]; px=xx-M
Z=(km>0)&(yy<434)&(px>555)&(px<1280)
KB=np.where((km>0)&~Z,base,np.nan)
# samples from tipped frames
samp=[];sv=[]
for n in range(1419,1429):
    w=plate_from_frame(Pf[n],n)
    blur=cv2.GaussianBlur(np.clip(Pf[n],0,1),(0,0),10)
    bw=plate_from_frame(blur,n)
    valid=(w>=0)&(bw<0.33)
    samp.append(np.where(valid,w,np.nan))
samp=np.array(samp)
need=(km>0)&np.isnan(KB)
med=np.nanmedian(samp,0)
KB=np.where(need,med,KB)
# what is still missing (far right, only seen while the synth tips fast): the blurred late frames
samp2=[]
for n in range(1429,1433):
    w=plate_from_frame(Pf[n],n); samp2.append(np.where(w>=0,w,np.nan))
med2=np.nanmedian(np.array(samp2),0)
need=(km>0)&np.isnan(KB)&(xx-M>2000)
KB=np.where(need,med2,KB)
print('KB unfilled in mask frac',(np.isnan(KB)&(km>0)).sum()/(km>0).sum())
KBv=np.where(np.isnan(KB),0,KB).astype(np.float32)*(km>0)
np.save('KBB_P.npy',KBv); np.save('KBB_mask.npy',km)
cv2.imwrite('KBB_view.jpg',(np.clip(KBv,0,1)*255).astype(np.uint8))
