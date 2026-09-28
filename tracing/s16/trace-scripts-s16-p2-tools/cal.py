import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, numpy as np, cv2, json, pickle
from trace_plate import js_drawing
E=np.load('plateE.npy')[90:90+946,90:90+2206]
Y=tr.denoise(E,5)
box=(1150,0,1850,500)
m=np.zeros(Y.shape,bool); m[box[1]:box[3],box[0]:box[2]]=True
Bm=cv2.medianBlur((np.clip(Y,0,1)*255).astype(np.uint8),5).astype(np.float32)/255
out=[]
for off in (0.0,0.25,0.4,0.5):
    tr.OFFSET=off
    L=tr.levels(Bm,m,[(k+0.5)/32 for k in range(32)],minarea=4,eps=0.7)
    R=tr.render_levels(L,Y.shape,ss=4)
    np.save(f'cal_py_{off}.npy',R[box[1]:box[3],box[0]:box[2]])
    out.append(js_drawing('C%d'%int(off*100),L,[],[],box))
np.save('cal_med.npy',Bm[box[1]:box[3],box[0]:box[2]])
open('cal_data.js','w').write('\n'.join(out))
open('cal_test.js','w').write('''import { drawLevels, decode } from "/src/shots/s16/vec.js";
import * as C from "/snapshots/s16-p2-tools/cal_data.js";
export const shot = { draw(ctx, local, t) {
  const k = Math.round(t * 25) - 1000; const name = ["C0","C25","C40","C50"][k];
  ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle="#000"; ctx.fillRect(0,0,2206,946);
  drawLevels(ctx, decode(C[name]).L);
} };''')
