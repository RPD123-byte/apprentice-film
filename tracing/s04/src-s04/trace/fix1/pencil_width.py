# pencil_width.py : the pencil's width and centre line per frame (the AI-drawn source does not keep it rigid: 36 px
# across its outlines on 20.56, ~26 on 19.24). Along the tracked axis (pencil.json / pencilB.json; tip -> far end),
# at 5 stations on the shaft, the across-profile of the frame (paint values) is sampled +-30 px; the two outline lines
# are the darkest points either side of the bright middle. Median over the stations -> half-width and the centre's
# offset from the tracked axis. Writes snapshots/s04-fix1w/pencilw.json. Measurements only.
import cv2, numpy as np, json, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s04/trace'); from grade import degrade
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
out={}
for name,fn,o,e,stations in [('A','pencil.json',(706,728),(1392,727),(0.18,0.23,0.62,0.7,0.8)),('B','pencilB.json',(1136,519),(1343,453),(0.3,0.45,0.6,0.7,0.8))]:
    T=json.load(open(f'/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/{fn}'))
    for k,A in sorted(T.items(),key=lambda kv:int(kv[0])):
        f=int(k); A=np.array(A).reshape(2,3)
        P=degrade(cv2.cvtColor(cv2.imread(f'{SP}/{f}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),f/25)
        t=A[:,:2]@np.array(o)+A[:,2]; q=A[:,:2]@np.array(e)+A[:,2]
        ax=(q-t)/np.linalg.norm(q-t); n=np.array([-ax[1],ax[0]])
        hws=[]; offs=[]
        for st in stations:
            c=t+(q-t)*st
            prof=np.array([cv2.getRectSubPix(P,(1,1),tuple((c+n*s).astype(np.float32)))[0,0] for s in np.arange(-30,30.5,0.5)])
            prof=cv2.GaussianBlur(prof.reshape(-1,1),(0,0),1.0).ravel()
            ss=np.arange(-30,30.5,0.5)
            mid=(ss>-10)&(ss<10)
            if prof[mid].max()<150: continue
            i0=np.argmax(np.where(mid,prof,-1))   # a bright point near the middle
            left=np.argmin(np.where((ss<ss[i0])&(ss>-28),prof,999)); right=np.argmin(np.where((ss>ss[i0])&(ss<28),prof,999))
            if prof[left]>90 or prof[right]>90: continue
            hws.append((ss[right]-ss[left])/2); offs.append((ss[right]+ss[left])/2)
        if hws:
            out[k]={'hw':round(float(np.median(hws)),1),'off':round(float(np.median(offs)),1),'n':len(hws),'m':name}
            print(f'{f/25:.2f} {name} hw {np.median(hws):.1f} off {np.median(offs):+.1f} ({len(hws)} of {len(stations)})', flush=True)
        else: print(f'{f/25:.2f} {name} none')
json.dump(out,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/pencilw.json','w'))
