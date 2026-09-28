# fit DES_TONE blobs for the beanie crown (only seen in the pans) against the pan study mosaic (pre-grade, half res)
import sys, os, json, re, subprocess, base64, cv2, numpy as np
N=int(sys.argv[1]); os.environ['ENTRY']='entry_des.js'; sys.argv=[sys.argv[0]]
from run import Lab
DY=420; out='../s02-r3-tone'
L=Lab(); u=L.js('()=>LAB.desCanvas(false)'); L.close()
D=cv2.imdecode(np.frombuffer(base64.b64decode(u.split(',',1)[1]),np.uint8),cv2.IMREAD_UNCHANGED)
Dg=cv2.cvtColor(D[...,:3],cv2.COLOR_BGR2GRAY).astype(np.float32)*(D[...,3]/255.0)
cv2.imwrite(f'{out}/descanvas.png',Dg.astype(np.uint8))
M=np.load('../s02-r3-meas/world_pre_half.npy'); X0,Y0,S=-100,-2000,0.5
H,W=Dg.shape
# source in designer-canvas coords: canvas (x, y) = world (x, y - DY)
xs=np.arange(W); ys=np.arange(H)-DY
mx=((xs-X0)*S).astype(np.float32); my=((ys-Y0)*S).astype(np.float32)
mapx,mapy=np.meshgrid(mx,my)
Src=cv2.remap(M.astype(np.float32),mapx,mapy,cv2.INTER_LINEAR)
np.save(f'{out}/crown_src.npy',Src)
mask=((Dg>30)&(Src>5)).astype(np.uint8)*255
mask[DY+60:,:]=0     # crown only (world y < 60)
mask=cv2.erode(mask,np.ones((15,15),np.uint8))
cv2.imwrite(f'{out}/mask_crown.png',mask)
subprocess.run(['python3','/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py',f'{out}/descanvas.png',f'{out}/crown_src.npy',f'{out}/mask_crown.png','-',f'{out}/new.json',str(N),'28,48'])
new=[[b[0],b[1]-DY,b[2],b[3]] for b in json.load(open(f'{out}/new.json'))]
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
s=open(TD).read()
if 'CROWN_TONE' not in s: s+='export const CROWN_TONE = [];\n'
m=re.search(r'export const CROWN_TONE = (\[.*?\]);\n',s,re.S)
s=s[:m.start()]+'export const CROWN_TONE = '+json.dumps(new,separators=(',',':'))+';\n'+s[m.end():]
open(TD,'w').write(s); print('CROWN_TONE', len(new))
