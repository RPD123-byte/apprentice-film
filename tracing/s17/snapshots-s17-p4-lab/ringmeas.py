import sys, cv2, numpy as np, json
sys.path.insert(0,'.')
from lab import *
from owlm import om
L=Lab()
ts=[float(x) for x in sys.argv[1].split(',')]
tot=[]
for t in ts:
    e=L.js(f'() => {{ const p = window.S17.OWL.owlFrame({t}); const f = p.eyes.fix; if (!f) return null; return f.map(q => [p.x + q[0]*p.s, p.y + q[1]*p.s, q[2]*p.s, q[3]*p.s]); }}')
    fr=L.frame(t); s0=src(t)
    s=cv2.cvtColor(s0,cv2.COLOR_BGR2GRAY).astype(np.float32); f=cv2.cvtColor(fr,cv2.COLOR_BGR2GRAY).astype(np.float32)
    out=[]
    for im in [s,f]:
        g=cv2.GaussianBlur(im,(0,0),0.7)
        cx,cy,rx,ry=e[1] if t>=52.68 else e[0]
        mins=[min(g[int(round(cy+np.sin(a)*ry*k)),int(round(cx+np.cos(a)*rx*k))] for k in np.linspace(0.6,1.3,29)) for a in np.linspace(0,2*np.pi,16,endpoint=False)]
        out.append(np.median(mins))
    o=om(fr,s0,t,1.5); tot.append(o)
    print(t,'src %.0f ren %.0f  om %.2f'%(out[0],out[1],o),flush=True)
print('mean om %.3f'%np.mean(tot))
L.close()
