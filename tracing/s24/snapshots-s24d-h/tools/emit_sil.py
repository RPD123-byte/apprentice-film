# write measured silhouettes (simplified outline polygons + notch points) as a JS module (integer coords)
import json,sys
out=sys.argv[1]; items=sys.argv[2:]
lines=['// s24 measured silhouettes: simplified outline polygons (RDP, 1.5 px) of the figures and the concave notches between',
       '// their feathers, measured on the source (drawing plates = motion-compensated medians / clean frames; see fidelity/s24.md).',
       '// Coordinates only; the drawing is procedural (paint.js).']
for it in items:
  name,fn,idx=it.split(':')
  r=json.load(open(fn))
  for j in [int(v) for v in idx.split(',')]:
    c=r[j]
    pts=','.join('%d,%d'%(p[0],p[1]) for p in c['pts'])
    no=','.join('%d,%d'%(p[0],p[1]) for p in c['notch'])
    lines.append('export const %s%d = { pts: pairs([%s]), notch: pairs([%s]) };'%(name,j,pts,no))
lines.insert(3,'function pairs(a) { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; }')
open(out,'w').write('\n'.join(lines)+'\n')
