import cv2, glob, re, numpy as np, math, sys
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s17f/'
dirs=sys.argv[1].split(',')
RP_A=sys.argv[2]; RP_B=sys.argv[3]   # render plates: 49.00 (for x<600) and 53.20 (for x>=600)
def plate(a,b):
    p=b.copy(); p[:, :600]=a[:, :600]; return p
rp=plate(cv2.imread(RP_A,0),cv2.imread(RP_B,0)).astype(np.float32)
sp=plate(cv2.imread(S+'src/f1225.png',0),cv2.imread(S+'src/f1330.png',0)).astype(np.float32)
def mask(im,pl):
    d=np.abs(cv2.GaussianBlur(im,(0,0),1.5)-cv2.GaussianBlur(pl,(0,0),1.5))
    m=(d>20).astype(np.uint8)
    m[:, :330]=0; m[:, 930:]=0; m[:290]=0; m[600:]=0
    m[352:467,808:872]=0   # steam box
    m[250:310,1000:1140]=0
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n>1:
        k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=(lab==k).astype(np.uint8)
    # fill holes
    ff=m.copy(); h,w=m.shape; mm=np.zeros((h+2,w+2),np.uint8); cv2.floodFill(ff,mm,(0,0),1); m=m|(1-ff)
    return m.astype(bool)
print('%-6s %6s  %5s %5s | %-17s | %-17s | %-17s'%('t','IoU','upIoU','','mean r/s','>=220 r/s','<150 r/s'))
for d in dirs:
    fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
    for f in fs:
        t=float(re.search(r'at-([\d.]+)s',f).group(1)); q=math.floor(t*30+1e-9)/30; n=math.ceil(q*25-0.01)
        if n<1222 or n>1330: continue
        a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(S+'src/f%04d.png'%n,0).astype(np.float32)
        ma=mask(a,rp); mb=mask(b,sp)
        iou=(ma&mb).sum()/max(1,(ma|mb).sum())
        ys=np.where(mb.any(1))[0]; y440=440
        ua=ma.copy(); ub=mb.copy(); ua[y440:]=0; ub[y440:]=0
        uiou=(ua&ub).sum()/max(1,(ua|ub).sum())
        A=a[ma]; B=b[mb]
        print('%.2f %6.3f  %5.3f       | %6.1f / %6.1f | %5.1f%% / %5.1f%% | %5.1f%% / %5.1f%%'%(t,iou,uiou,A.mean(),B.mean(),100*(A>=220).mean(),100*(B>=220).mean(),100*(A<150).mean(),100*(B<150).mean()))
