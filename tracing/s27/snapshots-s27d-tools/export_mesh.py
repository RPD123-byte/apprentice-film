# Export the designer's measured mesh warp (des_mesh*.json) to src/shots/s27/drawn/desmesh.js
import json, sys
fn=sys.argv[1] if len(sys.argv)>1 else '../s27d-meas/des_mesh.json'
J=json.load(open(fn))
X0,Y0,X1,Y1,GX,GY=J['grid']
rows=[]
for r in J['frames']:
    t=r[0]; v=r[1:]
    rows.append('['+f'{t:.2f},'+','.join(f'{x:.1f}'.rstrip('0').rstrip('.') for x in v)+']')
s=("// s27 (drawn) — the designer's measured motion: a GX x GY grid of node positions per source frame (frame px), fitted to\n"
   "// KLT point tracks inside his silhouette relative to the held view at 125.0 s (snapshots/s27d-tools/des_mesh*.py).\n"
   "// Positions only. Node (i,j) at 125.0 = (X0 + i*(X1-X0)/(GX-1), Y0 + j*(Y1-Y0)/(GY-1)).\n"
   f"export const DES_GRID = {{ X0: {X0}, Y0: {Y0}, X1: {X1}, Y1: {Y1}, GX: {GX}, GY: {GY}, TREF: {J['tref']} }};\n"
   "export const DES_MESH = [\n"+",\n".join(rows)+"];\n")
open('../../src/shots/s27/drawn/desmesh.js','w').write(s)
print(len(rows),'frames', len(s)//1024,'KB')
