# tojs.py poses.json NAME out.js "comment" : per-frame rig poses -> compact JS module (frame -> flat vector)
import json, sys
P=json.load(open(sys.argv[1])); name=sys.argv[2]; out=sys.argv[3]; note=sys.argv[4] if len(sys.argv)>4 else ''
KEYS=['head.x','head.y','head.r','head.rot','head.yaw','body.x','body.y','body.rx','body.ry','body.rot']
for k in (0,1): KEYS+=[f'wings.{k}.S.0',f'wings.{k}.S.1',f'wings.{k}.Wr.0',f'wings.{k}.Wr.1',f'wings.{k}.T.0',f'wings.{k}.T.1',f'wings.{k}.trail',f'wings.{k}.sec']
KEYS+=['feet.0.x','feet.0.y','feet.0.ang','feet.1.x','feet.1.y','feet.1.ang']
import os
if os.environ.get('SIZES'): KEYS+=['feet.0.size','feet.1.size','head.yaw','wings.0.w','wings.1.w']
def get(p,path):
    o=p
    for k in path.split('.'):
        o=o[int(k)] if isinstance(o,list) else o.get(k) if o is not None else None
        if o is None: return None
    return o
rows=[]
for F in sorted(P,key=int):
    v=[get(P[F],k) for k in KEYS]
    rows.append(f'  {F}: [' + ','.join(('%.4g'%x if isinstance(x,float) and abs(x)<10 else '%.1f'%x) if x is not None else 'null' for x in v) + '],')
txt=f'''// {note}
// Per source frame: [{", ".join(KEYS)}] (frame px, radians). Fitted with snapshots/s26b-meas/fit (rig silhouette vs the
// source owl mask, IoU, plus the tracked irises); measurements only.
export const {name}_KEYS = {json.dumps(KEYS)};
export const {name} = {{
''' + '\n'.join(rows) + '\n};\n'
open(out,'w').write(txt); print(len(rows),'frames ->',out)
