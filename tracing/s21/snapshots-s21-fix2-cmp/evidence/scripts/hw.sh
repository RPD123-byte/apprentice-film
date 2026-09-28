#!/bin/bash
# hw.sh "t1,t2,.." HW HH OX OY DIR1 DIR2 ... : window round the probed head centre (+OX,OY), mean over times
TS=$1; HW=$2; HH=$3; OX=$4; OY=$5; shift 5
cd /Users/computer/rootline/apprentice-film/snapshots
node s21-fix2-tools/probe.mjs $TS 2>/dev/null > /tmp/_hw_probe.$$ 
python3 - "$HW" "$HH" "$OX" "$OY" "$@" <<'PY'
import sys,json,subprocess,numpy as np,re,os
hw,hh,ox,oy=map(float,sys.argv[1:5]); dirs=sys.argv[5:]
P=[json.loads(l) for l in open([f for f in os.listdir('/tmp') if f.startswith('_hw_probe')] and '/tmp/'+sorted([f for f in os.listdir('/tmp') if f.startswith('_hw_probe')],key=lambda f:os.path.getmtime('/tmp/'+f))[-1])]
for d in dirs:
    acc=[]
    for p in P:
        h=p['head']; t=p['t']; x0=int(h[0]-hw+ox); y0=int(h[1]-hh+oy)
        o=subprocess.run(['python3','s21-fix2-tools/tw.py',str(x0),str(y0),str(int(x0+2*hw)),str(int(y0+2*hh)),d,'--',f'{t:.2f}'],capture_output=True,text=True).stdout
        m=re.search(r'MAE\s+([\d.]+) NCC ([\d.]+)',o); acc.append((float(m.group(1)),float(m.group(2))))
    a=np.array(acc); print(f'{d.split("/")[-1]:8s} MAE {a[:,0].mean():.2f} NCC {a[:,1].mean():.3f}  ', ' '.join(f'{x:.1f}' for x in a[:,0]))
PY
rm -f /tmp/_hw_probe.$$
