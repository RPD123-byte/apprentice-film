# refit OWL_TONE (the sitting owl) after the redraw: the owl alone at f370, drawn without tone, vs the hold average
import sys, os, json, re, subprocess, cv2, numpy as np
N=int(sys.argv[1]); sys.argv=[sys.argv[0]]
from run import Lab
OUT='../s02-fix1-tone'; os.makedirs(OUT,exist_ok=True)
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
L=Lab(); L.js('()=>{globalThis.__NOTONE=true}'); L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'owlOnly':True,'room':False}})
img,_=L.frame(370,False); L.close()
g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY); cv2.imwrite(f'{OUT}/owl370.png',g)
A=np.load('../s02-r3-meas/hold_pre.npy')
B=cv2.GaussianBlur(A,(0,0),1.5); S=(B>150).astype(np.uint8); S[:25]=0; S[352:]=0; S[:,:950]=0; S[:,1240:]=0
n,lab,st,cen=cv2.connectedComponentsWithStats(S,8); k=1+np.argmax(st[1:,4]); S=(lab==k).astype(np.uint8)
S=cv2.morphologyEx(S,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
mask=(cv2.erode(S,np.ones((7,7),np.uint8))&(g>40)).astype(np.uint8)*255
cv2.imwrite(f'{OUT}/mask_owl.png',mask)
subprocess.run(['python3','/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py',f'{OUT}/owl370.png','../s02-r3-meas/hold_pre.npy',f'{OUT}/mask_owl.png','-',f'{OUT}/owl.json',str(N)])
new=json.load(open(f'{OUT}/owl.json'))
s=open(TD).read(); m=re.search(r'export const OWL_TONE = (\[.*?\]);\n',s,re.S)
s=s[:m.start()]+'export const OWL_TONE = '+json.dumps(new,separators=(',',':'))+';\n'+s[m.end():]; open(TD,'w').write(s)
print('OWL_TONE',len(new))
