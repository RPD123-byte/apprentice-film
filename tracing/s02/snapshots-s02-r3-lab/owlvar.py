# render flyFront variants at frame 463's placement next to the source crop
import sys, os, json, cv2, numpy as np, re
os.environ['ENTRY']='entry_owl.js'; sys.argv=[sys.argv[0]]+sys.argv[1:]
VARS=json.loads(open(sys.argv[1]).read())
from run import Lab
T=open('../../src/shots/s02/hand/owltrack.js').read()
R=[float(v) for v in re.search(r'OWL_ROOT = \[(.*?)\]',T).group(1).split(',')]
f=463; k=f-397; x,y,s,b=R[4*k:4*k+4]
L=Lab(); tiles=[]
src=cv2.imread(f'../s02-r3-src/{f:04d}.png')
x0,y0,x1,y1=1150,120,2150,560
for v in VARS:
    L.js('(a)=>{const p=LAB.owlPose("flyFront",a[0]); window.OWLCFG=Object.assign({},p,{x:a[1],y:a[2],s:a[3],rot:a[4]})}',[v,x,y,s,b])
    img,_=L.frame(f)
    tiles.append(img[y0:y1,x0:x1])
L.close()
tiles.append(src[y0:y1,x0:x1])
cv2.imwrite('../s02-r3-r42/owlvar.jpg',np.vstack(tiles))
