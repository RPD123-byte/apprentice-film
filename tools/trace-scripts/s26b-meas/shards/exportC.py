import json, numpy as np
D=json.load(open('cells-C.json')); segs=json.load(open('segsC.json')); cam=json.load(open('camAffC.json'))
L={'bw':0,'col':1,'black':2}
cells=[]
for c in D['cells']:
    p=np.array(c['poly']).ravel().tolist()
    if len(p)<6: continue
    row=[L[c['lab']],c['dx'],c['dy']]
    row+= [int(round(v)) for v in c['mean'][::-1]] if c['lab']=='black' else [0,0,0]
    cells.append(row+p)
def fl(a,nd=1): return ','.join(('%.*f'%(nd,v)).rstrip('0').rstrip('.') for v in a)
txt='''// s26 beat C (111.60–112.68): the blast's shard field, measured on the source (coordinates only; see fidelity/s26.md):
//   * the shard outlines = bright thin lines persisting over 111.84–112.68 once each frame is mapped back onto the
//     112.00 frame (ORB affine per frame), Hough segments of that presence map;
//   * the cells between them; per cell: what shows in it on the 112.00 frame — the B&W page (bw, under the global
//     similarity Mb from stage px, plus the cell's own shift, searched to ±150 px), the colour page (col, under Mc
//     from colour-page px, plus a shift to ±170 px), or a dark flat cell (black, its mean colour);
//   * cam: the whole field's affine per source frame (field = 112.00 frame coordinates).
// cells: [label 0 bw | 1 col | 2 black, dx, dy, r, g, b, x0, y0, x1, y1, ...]
export const FIELD_C = {
  Mb: [%s], Mc: [%s],
  cam: {%s},
  segs: [%s],
  cells: [
%s
  ],
};
''' % (fl(np.array(D['Mb']).ravel(),5), fl(np.array(D['Mc']).ravel(),5),
       ', '.join(f'{F}: [{fl(v,5)}]' for F,v in cam.items()),
       fl(np.array(segs).ravel(),1),
       ',\n'.join('    ['+fl(r,1)+']' for r in cells))
open('/Users/computer/rootline/apprentice-film/src/shots/s26/fieldC.js','w').write(txt)
print(len(cells))
