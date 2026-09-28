import json
d={}
import glob
for p in sorted(glob.glob('../s25-meas/smoke3-25*.json')): d.update(json.load(open(p)))
fs=sorted(int(k) for k in d); F0=2512
d['2514']=d.get('2513',[])
rows=[d.get(str(f),[]) for f in range(F0,fs[-1]+1)]
js='// s25 v2 — the chaos smoke per frame as rotated soft gaussian puffs [x, y, sx, sy, a, θ]* (frame px; a = alpha of grey smoke\n'
js+='// laid over the page, summed), fitted by least squares to the alpha each source frame shows over the clean chaos plate,\n'
js+='// owls / chips / slash arcs left out (snapshots/s25-tools/smokefit.py fit3). Numbers only.\n'
js+=f'export const SMOKE_F0 = {F0};\nexport const SMOKE = '+json.dumps(rows,separators=(',',':'))+';\n'
open('../../src/shots/s25/v2/smoke.js','w').write(js); print(F0,len(rows),len(js))
