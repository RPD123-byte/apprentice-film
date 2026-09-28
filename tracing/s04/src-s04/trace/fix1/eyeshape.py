# eyeshape.py : his eyes' shapes per source frame, measured in the EYE'S OWN FRAME: the source frame (paint values) is
# warped back by the eye's measured track (eyetrack.js + eyetrack2) to the 20.56 geometry, so the camera's motion is
# removed and only the eye's own change is left. There, per column (every 2 eye px): the opening's top and bottom =
# where the lit interior (sclera / iris, paint > 80) meets the dark lid lines, scanning out from the eye's middle row;
# the pupil = darkest compact blob; the iris's right edge = the iris / sclera step on the pupil's row.
# Writes snapshots/s04-fix1w/eyeshape.json and a debug sheet. Measurements only.
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s04/trace')
from grade import degrade
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
def P(fi): return degrade(cv2.cvtColor(cv2.imread(f'{SP}/{fi}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32), fi/25).astype(np.float32)
s=open('/Users/computer/rootline/apprentice-film/src/shots/s04/eyetrack.js').read()
T1=json.loads(s[s.index('{',s.index('EYETRACK')):s.rindex('}')+1])
T2=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyetrack2.json'))
TR={**T1, **T2}
BOX={'L':(760,250,960,390),'R':(1140,250,1340,380)}
MID={'L':326,'R':320}          # the eye's middle row (eye px) at 20.56
XR={'L':(768,948),'R':(1156,1322)}
TH=80
out={}; sheet=[]
frames={'R':[514]+list(range(533,562)),'L':[514]+list(range(533,548))}
for k in ['R','L']:
    x0,y0,x1,y1=BOX[k]; S=2; W=(x1-x0)*S; H=(y1-y0)*S
    for fi in frames[k]:
        t=f'{fi/25:.2f}'
        if t not in TR or k not in TR[t]: continue
        A=np.array(TR[t][k]['A']).reshape(2,3)
        M=np.array([[A[0,0]/S,A[0,1]/S,A[0,0]*x0+A[0,1]*y0+A[0,2]],[A[1,0]/S,A[1,1]/S,A[1,0]*x0+A[1,1]*y0+A[1,2]]],np.float32)
        can=cv2.warpAffine(P(fi),M,(W,H),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
        can=cv2.GaussianBlur(can,(0,0),1.5)
        cols=[]
        for ex in range(XR[k][0],XR[k][1]+1,2):
            cx=(ex-x0)*S; yc=(MID[k]-y0)*S
            col=can[:,cx]
            # start inside: the brightest of the middle +-10 eye px
            ys=np.arange(yc-20,yc+21); ys=ys[(ys>=0)&(ys<H)]
            ystart=ys[np.argmax(col[ys])]
            if col[ystart]<TH+40: cols.append([ex,None,None]); continue
            # up / down until 3 consecutive px below TH (the lid line); small dark gaps (the pupil) are crossed only if
            # lit again within 6 px and no lid is near
            def scan(d):
                y=ystart; run=0
                while 0<y<H-1:
                    y+=d
                    if col[y]<TH: run+=1
                    else: run=0
                    if run>=4: return y-d*(run-1)
                return None
            tp=scan(-1); bt=scan(1)
            if tp is None or bt is None or bt-tp<4: cols.append([ex,None,None]); continue
            cols.append([ex,round(tp/S+y0,1),round(bt/S+y0,1)])
        # pupil
        dk=(can<45).astype(np.uint8); n,lab,st,cen=cv2.connectedComponentsWithStats(dk)
        pup=None
        for j in range(1,n):
            a=st[j,cv2.CC_STAT_AREA]; w,h=st[j,cv2.CC_STAT_WIDTH],st[j,cv2.CC_STAT_HEIGHT]
            if a<40 or a>900 or max(w,h)>2.6*min(w,h) or a/(w*h)<0.45: continue
            px,py=cen[j]/S+[x0,y0]
            if abs(py-MID[k])>18 or not(XR[k][0]<px<XR[k][1]): continue
            if pup is None or a>pup[2]: pup=[round(float(px),1),round(float(py),1),int(a)]
        # iris right edge on the pupil's row: first step up to sclera (>200) right of the pupil
        irr=None
        if pup:
            row=can[int((pup[1]-y0)*S)]; xs=int((pup[0]-x0)*S)
            for xx in range(xs+10,min(W-1,xs+140)):
                if row[xx]>200 and row[xx+1]>200: irr=round((xx/S+x0)-pup[0],1); break
        # iris top / bottom on the pupil's column: from the pupil's edge out to the first dark (< 62) px -- the limbal
        # ring, or the lid line where the iris runs under the lid
        itop=ibot=None
        if pup:
            colv=can[:,int((pup[0]-x0)*S)]; yp=int((pup[1]-y0)*S)
            for yy in range(yp-2*8, 0, -1):
                if colv[yy]<62 and colv[yy-1]<62: itop=round(yy/S+y0,1); break
            for yy in range(yp+2*8, H-1):
                if colv[yy]<62 and colv[yy+1]<62: ibot=round(yy/S+y0,1); break
        out.setdefault(t,{})[k]={'cols':cols,'pupil':pup,'irr':irr,'itop':itop,'ibot':ibot}
        vis=cv2.cvtColor(np.clip(can,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
        for ex,tp,bt in cols:
            if tp is None: continue
            X=int((ex-x0)*S); cv2.circle(vis,(X,int((tp-y0)*S)),1,(0,0,255),-1); cv2.circle(vis,(X,int((bt-y0)*S)),1,(255,0,255),-1)
        if pup: cv2.circle(vis,(int((pup[0]-x0)*S),int((pup[1]-y0)*S)),3,(0,255,0),-1)
        if pup and irr: cv2.circle(vis,(int((pup[0]+irr-x0)*S),int((pup[1]-y0)*S)),3,(255,255,0),-1)
        cv2.putText(vis,t+k,(4,14),0,0.45,(0,255,255),1)
        sheet.append(vis)
        print(t,k,'pupil',pup,'irr',irr,'itop',itop,'ibot',ibot)
json.dump(out,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyeshape.json','w'))
h=max(s.shape[0] for s in sheet); w=max(s.shape[1] for s in sheet)
sheet=[cv2.copyMakeBorder(s,0,h-s.shape[0],0,w-s.shape[1],cv2.BORDER_CONSTANT) for s in sheet]
while len(sheet)%6: sheet.append(np.zeros_like(sheet[0]))
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/eyeshape.jpg',np.vstack([np.hstack(sheet[i:i+6]) for i in range(0,len(sheet),6)]))
