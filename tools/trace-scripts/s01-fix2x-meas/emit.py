# emit.py tr.json NAME [minlen] : print a JS array of measured fold strokes [w, v, x0, y0, x1, y1, ...]
import json, sys, numpy as np
T=json.load(open(sys.argv[1])); name=sys.argv[2]; ml=int(sys.argv[3]) if len(sys.argv)>3 else 14; EPS=float(sys.argv[4]) if len(sys.argv)>4 else 0.7; WK=float(sys.argv[5]) if len(sys.argv)>5 else 0.75
def dp(pts, eps):
    if len(pts)<3: return pts
    a,b=np.array(pts[0],float),np.array(pts[-1],float); d=b-a; L=np.hypot(*d) or 1
    dist=[abs(np.cross(d,np.array(p,float)-a))/L for p in pts[1:-1]]
    i=int(np.argmax(dist))+1
    if dist[i-1]>eps: return dp(pts[:i+1],eps)[:-1]+dp(pts[i:],eps)
    return [pts[0],pts[-1]]
out=[]
for r in T:
    if len(r['p'])<3 and r['len']<ml: continue
    if r['len']<ml: continue
    p=r['p']
    # re-sample densely then simplify
    q=dp(p,EPS)
    w=float(np.clip(WK*np.median(r['w']),1.0,3.4)); v=int(np.median(r['v']))
    if v>205: continue
    out.append([round(w,1),v]+[c for xy in q for c in xy])
print(f'export const {name} = [')
for o in out: print('  ['+', '.join(str(x) for x in o)+'],')
print('];')
print(len(out), file=sys.stderr)
