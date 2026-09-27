# refit only SOFT_TONE with N blobs (keeping DES_TONE and CROWN_TONE)
import sys, os, json, re, subprocess, base64, cv2, numpy as np
N=int(sys.argv[1]); sig=sys.argv[2] if len(sys.argv)>2 else None
os.environ['ENTRY']='entry_des2.js'; sys.argv=[sys.argv[0]]
from run import Lab
OUT='../s02-fix1-tone'; T3='../s02-r3-tone'; DY=420
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
s=open(TD).read(); g=lambda k: json.loads(re.search(r'export const '+k+r' = (\[.*?\]);',s,re.S).group(1))
des=g('DES_TONE')+g('CROWN_TONE')
dec=lambda u: cv2.imdecode(np.frombuffer(base64.b64decode(u.split(',',1)[1]),np.uint8),cv2.IMREAD_UNCHANGED)
L=Lab(); L.js('(o)=>window.__setTone(o)',{'des':des,'soft':[]}); D=dec(L.js('(l)=>LAB.desCanvas(l)','soft')); L.close()
C=cv2.cvtColor(D[...,:3],cv2.COLOR_BGR2GRAY).astype(np.float32)*(D[...,3]/255.0)
cv2.imwrite(f'{OUT}/in.png',C.astype(np.uint8))
subprocess.run(['python3','/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py',f'{OUT}/in.png',f'{T3}/soft_src.npy',f'{T3}/mask_soft.png','-',f'{OUT}/new.json',str(N)]+([sig] if sig else []))
soft=[[b[0],b[1]-DY,b[2],b[3]] for b in json.load(open(f'{OUT}/new.json'))]
m=re.search(r'export const SOFT_TONE = (\[.*?\]);\n',s,re.S)
s=s[:m.start()]+'export const SOFT_TONE = '+json.dumps(soft,separators=(',',':'))+';\n'+s[m.end():]; open(TD,'w').write(s); print('SOFT',len(soft))
