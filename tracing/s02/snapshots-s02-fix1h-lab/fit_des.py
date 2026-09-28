# refit DES_TONE for the redrawn stare designer: render the raw designer (only CROWN_TONE applied) at f160, fit N round
# gaussians against the ungraded stare average inside the designer mask, write the list to tonedata.js
import sys, os, json, re, subprocess, cv2, numpy as np
N=int(sys.argv[1]); os.environ['ENTRY']='entry_des2.js'; sys.argv=[sys.argv[0]]
from run import Lab
OUT='../s02-fix1h-tone'; os.makedirs(OUT,exist_ok=True)
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
L=Lab(); L.js('()=>window.__setTone({des: window.__TD.CROWN_TONE, soft: []})'); img,_=L.frame(160,False); L.close()
cv2.imwrite(f'{OUT}/des160.png',img)
subprocess.run(['python3','/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py',f'{OUT}/des160.png','../s02-r3-meas/stare_pre.npy','../s02-r3-tone/mask160.png','-',f'{OUT}/des.json',str(N)])
new=json.load(open(f'{OUT}/des.json'))
s=open(TD).read(); m=re.search(r'export const DES_TONE = (\[.*?\]);\n',s,re.S)
s=s[:m.start()]+'export const DES_TONE = '+json.dumps(new,separators=(',',':'))+';\n'+s[m.end():]
open(TD,'w').write(s); print('DES_TONE',len(new))
