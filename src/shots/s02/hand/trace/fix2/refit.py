# fix pass 2: refit DES_TONE / SOFT_TONE after the redraw, with the face oval and the beanie EXCLUDED from the fit mask
# (the film also drops the corrections there). python3 refit.py ND NS
import sys, os, json, re, subprocess, base64, cv2, numpy as np
ND,NS=[int(v) for v in sys.argv[1:3]]
os.environ['ENTRY']='entry_des2.js'; sys.argv=[sys.argv[0]]
from run import Lab
OUT='../s02-fix2-tone'; os.makedirs(OUT,exist_ok=True); T3='../s02-r3-tone'; DY=420
TF='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py'
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
dec=lambda u: cv2.imdecode(np.frombuffer(base64.b64decode(u.split(',',1)[1]),np.uint8),cv2.IMREAD_UNCHANGED)
def canvas(look, tone):
    L=Lab(); L.js('(o)=>window.__setTone(o)',tone); D=dec(L.js('(l)=>LAB.desCanvas(l)',look)); P=L.js('()=>window.__POLY'); L.close()
    return (cv2.cvtColor(D[...,:3],cv2.COLOR_BGR2GRAY).astype(np.float32)*(D[...,3]/255.0)), P
def excl(shape, P, dy):
    m=np.zeros(shape,np.uint8)
    for k in ('BEANIE','FACE_OVAL'): cv2.fillPoly(m,[np.array([[x,y+dy] for x,y in P[k]],np.int32)],255)
    return cv2.dilate(m,np.ones((25,25),np.uint8))
def fit(img, srcp, mask, n):
    cv2.imwrite(f'{OUT}/in.png',img.astype(np.uint8)); cv2.imwrite(f'{OUT}/mask.png',mask)
    subprocess.run(['python3',TF,f'{OUT}/in.png',srcp,f'{OUT}/mask.png','-',f'{OUT}/new.json',str(n)])
    return json.load(open(f'{OUT}/new.json'))
def put(key,val):
    s=open(TD).read(); m=re.search(r'export const '+key+r' = (\[.*?\]);\n',s,re.S)
    s=s[:m.start()]+'export const '+key+' = '+json.dumps(val,separators=(',',':'))+';\n'+s[m.end():]; open(TD,'w').write(s)
C,P=canvas(False,{'des':[],'soft':[]}); fr=C[DY:DY+946,:]
m=cv2.imread(f'{T3}/mask160.png',0); m=np.where(excl(m.shape,P,0)>0,0,m).astype(np.uint8)
des=fit(fr,'../s02-r3-meas/stare_pre.npy',m,ND)
C,P=canvas('soft',{'des':des,'soft':[]})
m=cv2.imread(f'{T3}/mask_soft.png',0); m=np.where(excl(m.shape,P,DY)>0,0,m).astype(np.uint8)
soft=[[b[0],b[1]-DY,b[2],b[3]] for b in fit(C,f'{T3}/soft_src.npy',m,NS)]
put('DES_TONE',des); put('SOFT_TONE',soft)
print('DES',len(des),'SOFT',len(soft))
