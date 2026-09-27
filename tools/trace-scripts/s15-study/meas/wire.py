import cv2,json,subprocess,sys,numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
times=sys.argv[1]; out=sys.argv[2]
js=json.loads(subprocess.check_output(['node','/Users/computer/rootline/apprentice-film/snapshots/s15-study/meas/wire.mjs',times]))
c=cv2.VideoCapture(V); tiles=[]
for t in times.split(','):
    t=float(t); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    d=js[f'{t:.2f}'] if f'{t:.2f}' in js else list(js.values())[len(tiles)]
    cols={0:(40,40,200),1:(200,40,200),2:(40,160,40),3:(40,170,230)}
    lay=np.zeros_like(f)
    for p in sorted(d['polys'],key=lambda q:-q['z']):
        pts=np.array(p['p'],np.int32)
        if np.abs(pts).max()>20000: continue
        cv2.fillPoly(lay,[pts],cols[p['k']])
        cv2.polylines(lay,[pts],True,(255,255,255),1)
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY); e=cv2.Canny(cv2.GaussianBlur(g,(5,5),0),40,100)
    f=cv2.addWeighted(cv2.cvtColor(g,cv2.COLOR_GRAY2BGR),0.55,lay,0.45,0)
    f[e>0]=(255,255,0)
    cv2.putText(f,f"{t:.2f} {d['set']}",(10,40),0,1.2,(255,255,255),3)
    tiles.append(cv2.resize(f,(1103,473)))
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]))
