# refit ROOM_TONE (the stare room) after the room redraw: room layer at f160 drawn without tone, vs the stare average
import sys, os, json, re, subprocess, cv2, numpy as np
N=int(sys.argv[1]); sys.argv=[sys.argv[0]]
from run import Lab
OUT='../s02-fix1-tone'; os.makedirs(OUT,exist_ok=True); T3='../s02-r3-tone'
TD='/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tonedata.js'
L=Lab(); L.js('()=>{globalThis.__NOTONE=true}'); L.js('(o)=>window.__labset(o)',{'only':{'room':True,'chars':False}})
img,_=L.frame(160,False); L.close()
cv2.imwrite(f'{OUT}/room160.png',cv2.cvtColor(img,cv2.COLOR_BGR2GRAY))
subprocess.run(['python3','/Users/computer/rootline/apprentice-film/src/shots/s02/hand/trace/tone_fit.py',f'{OUT}/room160.png','../s02-r3-meas/stare_pre.npy',f'{T3}/mask_room.png','-',f'{OUT}/room.json',str(N)])
new=json.load(open(f'{OUT}/room.json'))
s=open(TD).read(); m=re.search(r'export const ROOM_TONE = (\[.*?\]);\n',s,re.S)
s=s[:m.start()]+'export const ROOM_TONE = '+json.dumps(new,separators=(',',':'))+';\n'+s[m.end():]; open(TD,'w').write(s)
print('ROOM_TONE',len(new))
