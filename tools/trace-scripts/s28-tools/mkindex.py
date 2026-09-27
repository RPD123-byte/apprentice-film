import os,re
d='/Users/computer/rootline/apprentice-film/src/shots/s28/keys'
fs=sorted(f[:-3] for f in os.listdir(d) if f.endswith('.js') and f!='index.js')
fig=[f for f in fs if f.startswith('fig')]; lock=[f for f in fs if f.startswith('lock')]; room=[f for f in fs if f.startswith('room')]
lines=["// Key drawings of s28 (generated list; see snapshots/s28-tools/buildkeys.py)."]
for f in fig+lock+room: lines.append(f'import {f} from "./{f}.js";')
lines.append("// figure keys: [drawing, depth-grid name]; the locked keys share the 131.44 grid (same camera)")
lines.append("export const FIG = ["+", ".join(f'[{f}, "{f}"]' for f in fig)+", "+", ".join(f'[{f}, "fig13144"]' for f in lock)+"];")
lines.append("export const ROOM = ["+", ".join(room)+"];")
lines.append(f"export const NLOCK = {len(lock)};")
open(d+'/index.js','w').write("\n".join(lines)+"\n")
print(len(fig),len(lock),len(room))
