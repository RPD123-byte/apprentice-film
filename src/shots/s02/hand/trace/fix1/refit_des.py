# refit the designer's tone lists after a redraw (study script): DES_TONE (stare, f160), CROWN_TONE (crown, pan mosaic),
# SOFT_TONE (the pans' soft layer). Each fit runs on the layer drawn without its own list.
import sys, os, json, re, subprocess, base64, cv2, numpy as np
ND,NC,NS=[int(v) for v in sys.argv[1:4]]
os.environ['ENTRY']='entry_des2.js'; sys.argv=[sys.argv[0]]
from run import Lab
OUT='../s02-fix1-tone'; os.makedirs(OUT,exist_ok=True); T3='../s02-r3-tone'; DY=420
TF='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py'
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
dec=lambda u: cv2.imdecode(np.frombuffer(base64.b64decode(u.split(',',1)[1]),np.uint8),cv2.IMREAD_UNCHANGED)
def canvas(look, tone):
    L=Lab(); L.js('(o)=>window.__setTone(o)',tone); D=dec(L.js('(l)=>LAB.desCanvas(l)',look)); L.close()
    return (cv2.cvtColor(D[...,:3],cv2.COLOR_BGR2GRAY).astype(np.float32)*(D[...,3]/255.0))
def fit(img, srcp, maskp, n, sig=None):
    cv2.imwrite(f'{OUT}/in.png',img.astype(np.uint8))
    subprocess.run(['python3',TF,f'{OUT}/in.png',srcp,maskp,'-',f'{OUT}/new.json',str(n)]+([sig] if sig else []))
    return json.load(open(f'{OUT}/new.json'))
def put(key,val):
    s=open(TD).read(); m=re.search(r'export const '+key+r' = (\[.*?\]);\n',s,re.S)
    s=s[:m.start()]+'export const '+key+' = '+json.dumps(val,separators=(',',':'))+';\n'+s[m.end():]; open(TD,'w').write(s)
# 1. DES_TONE: the stare layer raw, in frame coords of f160 (canvas rows DY..DY+946)
C=canvas(False,{'des':[],'soft':[]}); fr=C[DY:DY+946,:]
des=fit(fr,'../s02-r3-meas/stare_pre.npy',f'{T3}/mask160.png',ND)
# 2. CROWN_TONE: the stare canvas with the new DES_TONE, against the pan mosaic in canvas coords
C=canvas(False,{'des':des,'soft':[]})
crown=[[b[0],b[1]-DY,b[2],b[3]] for b in fit(C,f'{T3}/crown_src.npy',f'{T3}/mask_crown.png',NC,'28,48')]
# 3. SOFT_TONE: the soft canvas raw
C=canvas('soft',{'des':des+crown,'soft':[]})
soft=[[b[0],b[1]-DY,b[2],b[3]] for b in fit(C,f'{T3}/soft_src.npy',f'{T3}/mask_soft.png',NS)]
put('DES_TONE',des); put('CROWN_TONE',crown); put('SOFT_TONE',soft)
print('DES',len(des),'CROWN',len(crown),'SOFT',len(soft))
