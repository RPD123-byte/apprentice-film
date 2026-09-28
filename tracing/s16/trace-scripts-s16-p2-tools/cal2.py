import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr, numpy as np, cv2, re
from trace_plate import js_drawing
# synthetic strokes: random-ish thin lines of widths 0.6..4 px, strength 0.5, on grey 0.6
rs=np.random.RandomState(1)
S=[]
for i in range(400):
    x=100+(i%20)*50+rs.rand()*10; y=100+(i//20)*20+rs.rand()*5; w=0.6+ (i%8)*0.45; a=0.5
    ang=rs.rand()*3.14
    pts=[[x+np.cos(ang)*t, y+np.sin(ang)*t, w, a] for t in np.linspace(0,30,8)]
    S.append(pts)
base=np.full((946,2206),0.6,np.float32)
for ss in (3,4):
    R=tr.render_strokes(base,S,ss=ss,polarity='dark'); np.save(f'cal2_py{ss}.npy',R)
# JS: strokes in canvas units = pixel-centre + 0.5
S2=[[[p[0]+0.5,p[1]+0.5,p[2],p[3]] for p in st] for st in S]
open('cal2_data.js','w').write(js_drawing('S',[],S2,[],(0,0,2206,946)))
open('cal2_test.js','w').write('''import { drawStrokes, decode } from "/src/shots/s16/vec.js";
import { S } from "/snapshots/s16-p2-tools/cal2_data.js";
export const shot = { draw(ctx) { ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle="rgb(153,153,153)"; ctx.fillRect(0,0,2206,946); drawStrokes(ctx, decode(S).D, false); } };''')
