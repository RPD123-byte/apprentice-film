# fit SOFT_TONE for the pans' soft designer against the return / outbound pan frames warped back to world coords
import sys, os, json, re, subprocess, base64, cv2, numpy as np
N=int(sys.argv[1]); os.environ['ENTRY']='entry_des.js'; sys.argv=[sys.argv[0]]
from run import Lab
sys.path.insert(0,'../s02-r3-meas'); from common import ungrade, src
DY=420; out='../s02-r3-tone'
L=Lab()
dec=lambda u: cv2.imdecode(np.frombuffer(base64.b64decode(u.split(',',1)[1]),np.uint8),cv2.IMREAD_UNCHANGED)
D=dec(L.js('()=>LAB.desCanvas("soft")')); A=dec(L.js('()=>LAB.desAlpha("soft")')); L.close()
Dg=cv2.cvtColor(D[...,:3],cv2.COLOR_BGR2GRAY).astype(np.float32)*(D[...,3]/255.0); Al=(A[...,3]>200)
cv2.imwrite(f'{out}/softcanvas.png',Dg.astype(np.uint8))
cam=json.load(open('../s02-r3-meas/oldcam.json'))
T=open('../../src/shots/s02/hand/owltrack.js').read()
R=[float(v) for v in re.search(r'OWL_ROOT = \[(.*?)\]',T).group(1).split(',')]
H,W=Dg.shape; acc=np.zeros((H,W),np.float32); wt=np.zeros((H,W),np.float32)
for f in list(range(462,478))+list(range(304,322)):
    c=cam[str(f)]; im=ungrade(src(f).astype(np.float32),f/25); m=np.ones_like(im)
    if f>=405:
        k=f-397; x,y,s,b=R[4*k:4*k+4]; m[max(0,int(y-520*s)):int(y+430*s), max(0,int(x-660*s)):int(x+660*s)]=0
    # canvas(x, y) = world(x, y - DY) = frame(x + c0, y - DY + c1)
    M=np.float32([[1,0,-c[0]],[0,1,-c[1]+DY]])
    wi=cv2.warpAffine(im,M,(W,H)); wm=cv2.warpAffine(m,M,(W,H))
    acc+=wi*wm; wt+=wm
Src=acc/np.maximum(wt,1e-3); np.save(f'{out}/soft_src.npy',Src)
mask=(Al&(wt>2)).astype(np.uint8)*255; mask=cv2.erode(mask,np.ones((15,15),np.uint8))
cv2.imwrite(f'{out}/mask_soft.png',mask); cv2.imwrite(f'{out}/soft_src.png',np.clip(Src,0,255).astype(np.uint8))
subprocess.run(['python3','/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py',f'{out}/softcanvas.png',f'{out}/soft_src.npy',f'{out}/mask_soft.png','-',f'{out}/new.json',str(N)])
new=[[b[0],b[1]-DY,b[2],b[3]] for b in json.load(open(f'{out}/new.json'))]
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
s=open(TD).read(); m=re.search(r'export const SOFT_TONE = (\[.*?\]);\n',s,re.S)
s=s[:m.start()]+'export const SOFT_TONE = '+json.dumps(new,separators=(',',':'))+';\n'+s[m.end():]
open(TD,'w').write(s); print('SOFT_TONE', len(new))
