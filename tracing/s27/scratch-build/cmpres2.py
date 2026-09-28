import sys, json, numpy as np, subprocess, cv2
sys.argv=['x','127.6','127.6','/dev/null']
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s27-k-tools/des_track.py').read().split("dis=cv2.DISOptical")[0])
js=subprocess.run(['node','-e',"import('/Users/computer/rootline/apprentice-film/src/shots/s27/data.js').then(m=>console.log(JSON.stringify(m.DES)))"],capture_output=True,text=True).stdout
D=np.array(json.loads(js))
T=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s27-k-trace/des_back.json'))['frames']
for t in [121.6,122.0,122.4,122.8,123.2,123.6,124.0,124.4,124.8]:
    i=np.argmin(abs(D[:,0]-t)); Pc=D[i,1:].reshape(-1,2)
    F=cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY).astype(np.float32)
    for nm,P in [('LK',Pc),('tracked',np.array(T[str(t)]))]:
        w,m=warp_tmpl(P); e=np.abs(w.astype(np.float32)-F)[m].mean()
        print(t,nm,round(float(e),1),end='  ')
    print()
