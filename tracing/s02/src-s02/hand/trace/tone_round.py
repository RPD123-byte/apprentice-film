# one tone-fit round: MODE des|room|hold|owl, N blobs; dumps the layer raw, fits, appends to tonedata.js
import sys, os, json, re, subprocess, cv2, numpy as np
MODE=sys.argv[1]; N=int(sys.argv[2])
CFG={'des':('entry_des.js',160,'stare_pre','DES_TONE',(0,0)),'room':('entry_room.js',160,'stare_pre','ROOM_TONE',(0,0)),
     'hold':('entry_room.js',370,'hold_pre','HOLD_TONE',(2203.3,-1893.4)),'owl':('entry_owlonly.js',370,'hold_pre','OWL_TONE',(0,0))}
entry,f,srcn,key,off=CFG[MODE]
os.environ['ENTRY']=entry; sys.argv=[sys.argv[0]]
from run import Lab
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'; out='../s02-r3-tone'
L=Lab(); img,_=L.frame(f,False); L.close()
cv2.imwrite(f'{out}/{MODE}{f}.png',img)
A=np.load(f'../s02-r3-meas/{srcn}.npy')
if MODE=='des': mask=cv2.imread(f'{out}/mask160.png',0)
elif MODE=='room':
    a=cv2.imread(f'{out}/alpha160.png',0); mask=255-cv2.dilate((a>127).astype(np.uint8)*255,np.ones((25,25),np.uint8))
elif MODE in ('hold','owl'):
    B=cv2.GaussianBlur(A,(0,0),1.5); S=(B>150).astype(np.uint8); S[:25]=0; S[352:]=0; S[:,:950]=0; S[:,1240:]=0
    n,lab,st,cen=cv2.connectedComponentsWithStats(S,8); k=1+np.argmax(st[1:,4]); S=(lab==k).astype(np.uint8)
    S=cv2.morphologyEx(S,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    R=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)>40 if MODE=='owl' else None
    if MODE=='owl': mask=(cv2.erode(S,np.ones((7,7),np.uint8))&R).astype(np.uint8)*255
    else: mask=255-cv2.dilate(S*255,np.ones((31,31),np.uint8))
cv2.imwrite(f'{out}/mask_{MODE}.png',mask)
subprocess.run(['python3','/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py',f'{out}/{MODE}{f}.png',f'../s02-r3-meas/{srcn}.npy',f'{out}/mask_{MODE}.png','-',f'{out}/new.json',str(N)]+(sys.argv[1:] if False else []))
new=[[round(b[0]+off[0],1),round(b[1]+off[1],1),b[2],b[3]] for b in json.load(open(f'{out}/new.json'))]
src=open(TD).read()
m=re.search(r'export const '+key+r' = (\[.*?\]);\n',src,re.S)
cur=json.loads(m.group(1))+new
src=src[:m.start()]+'export const '+key+' = '+json.dumps(cur,separators=(',',':'))+';\n'+src[m.end():]
open(TD,'w').write(src); print(key,'now',len(cur))
