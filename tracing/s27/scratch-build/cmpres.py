import sys, json, numpy as np, subprocess, cv2
sys.argv=['x','127.6','127.6','/dev/null']
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s27-k-tools/des_track.py').read().split("dis=cv2.DISOptical")[0])
js=subprocess.run(['node','-e',"import('/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js').then(m=>console.log(JSON.stringify(m.DES_END)))"],capture_output=True,text=True).stdout
DE=np.array(json.loads(js))
T=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s27-k-trace/des_end.json'))['frames']
for t in [127.84,128.2,128.44,128.68,128.8,129.04,129.28]:
    i=np.argmin(abs(DE[:,0]-t)); a,b,c,d,tx,ty=DE[i,1:]
    Pc=np.stack([a*G[:,0]+b*G[:,1]+tx,c*G[:,0]+d*G[:,1]+ty],1)
    F=cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY).astype(np.float32)
    for nm,P in [('current',Pc),('tracked',np.array(T[str(t)]))]:
        w,m=warp_tmpl(P); e=np.abs(w.astype(np.float32)-F)[m].mean()
        print(t,nm,round(float(e),1),end='  ')
    print()
