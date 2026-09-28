import cv2,glob,re,math,numpy as np,json
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,1010)
src={}
for n in range(1010,1150):
    ok,f=c.read(); src[n]=f
def disp(T):
    tq=math.floor(T*30+1e-9)/30
    if tq<40.72: return 's14',None
    if tq>=45.72: return 's16',None
    return 's15', math.floor(tq*25+0.5)
best={}
for d in ['dense','motion','motion2','tail','fix']:
    for p in glob.glob(f'snapshots/s15-rev1-r4-{d}/frame-*.png'):
        T=float(re.search(r'at-([\d.]+)s',p).group(1)); s,n=disp(T)
        if s!='s15': continue
        # prefer renders whose quantized time is closest to the frame
        tq=math.floor(T*30+1e-9)/30; off=abs(tq*25-n)
        if n not in best or off<best[n][1]: best[n]=(p,off)
print('frames covered',len(best),min(best),max(best),[n for n in range(1018,1143) if n not in best])
DUPS=[1023,1042,1048,1067,1072,1092,1097,1117,1121,1142]
rows=[]
os_=[]
for n in sorted(best):
    r=cv2.imread(best[n][0]); s=src[n]
    rg=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32); sg=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32)
    b12=float(np.abs(cv2.GaussianBlur(rg,(0,0),12)-cv2.GaussianBlur(sg,(0,0),12)).mean())
    b4=float(np.abs(cv2.GaussianBlur(rg,(0,0),4)-cv2.GaussianBlur(sg,(0,0),4)).mean())
    def gm(a):
        a=cv2.GaussianBlur(a,(0,0),2); return np.hypot(cv2.Sobel(a,cv2.CV_32F,1,0),cv2.Sobel(a,cv2.CV_32F,0,1))
    gc=float(np.corrcoef(gm(rg).ravel(),gm(sg).ravel())[0,1])
    # timing: best matching source frame (blurred)
    rs=cv2.resize(cv2.GaussianBlur(rg,(0,0),6),(441,189))
    cand=[(float(np.abs(rs-cv2.resize(cv2.GaussianBlur(cv2.cvtColor(src[k],cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6),(441,189))).mean()),k) for k in range(n-2,n+3) if k in src]
    cand.sort()
    # dark fraction: pixels < 20
    dr=float((rg<20).mean()); ds=float((sg<20).mean())
    rows.append(dict(n=n,t=round(n/25,2),s12=round(b12,1),s4=round(b4,1),lr=round(float(rg.mean()),1),ls=round(float(sg.mean()),1),dr=round(dr,3),ds=round(ds,3),gc=round(gc,2),best=cand[0][1]-n,bestd=round(cand[0][0],1),owncost=round([x for x in cand if x[1]==n][0][0],1),path=best[n][0]))
    # pair image for reading
    pr=np.hstack([cv2.resize(r,(1103,473)),cv2.resize(s,(1103,473))])
    cv2.putText(pr,f'{n/25:.2f} render',(10,30),0,1,(0,255,255),2); cv2.putText(pr,'source',(1113,30),0,1,(0,255,255),2)
    cv2.imwrite(f'snapshots/s15-rev1-r4-pairs/p{n}.jpg',pr,[cv2.IMWRITE_JPEG_QUALITY,88])
json.dump(rows,open(SP+'/rows.json','w'))
for r in rows: print(f"{r['n']} {r['t']:.2f} s12 {r['s12']:5.1f} s4 {r['s4']:5.1f} lum {r['lr']:5.1f}/{r['ls']:5.1f} dark<20 {r['dr']:.2f}/{r['ds']:.2f} gc {r['gc']:.2f} best {r['best']:+d} ({r['bestd']} vs {r['owncost']}) {'HOLD' if r['n'] in DUPS else ''}")
