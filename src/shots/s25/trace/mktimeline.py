import json,numpy as np
D='/Users/computer/rootline/apprentice-film/src/shots/s25'
KEYS=['pop','c308B','crouchB','r44B','r48B','r52B','r56B','h372B','scCL','scCR','scH1L','scH1R','hips1','t548','t552','t556','open1','open2','closed','t676','t684','t688','w692','w696','w700','raise','t852','hips2','fscL','fscR','dive','vs2','vs3','hov']+[f'b{f}' for f in range(2566,2575)]+['eTR','eSt','eFl','rem48','rem52','hov2','dash84']
# traces index
lines=['// s25 — every traced drawing, by key (see owlTrace.js; each file is control data measured on one source frame)']
for k in KEYS: lines.append(f'import {{ TR_{k.upper()} }} from "./tr_{k}.js";')
lines.append('export const TRACES = { '+', '.join(f'{k}: TR_{k.upper()}' for k in KEYS)+' };')
open(f'{D}/traces.js','w').write('\n'.join(lines)+'\n')
cam=json.load(open('camdrift.json')); sch=json.load(open('schedule.json')); spin=json.load(open('spintrack.json'))
F0,F1=2577,2762
camrows=[]
for f in range(F0,F1+1):
    v=cam[str(f)]; a=v[1:]
    camrows.append([round(a[0],5),round(a[3],5),round(a[1],5),round(a[4],5),round(a[2],2),round(a[5],2)])   # canvas order a,b,c,d,e,f
schrows=[]
for f in range(2576,F1+1):
    r=sch[str(f)]; k=r[0]; A=r[1:7]
    schrows.append([k,round(A[0],5),round(A[3],5),round(A[1],5),round(A[4],5),round(A[2],2),round(A[5],2)])
# spin: validity filter
ok={'fscL':lambda x,y:740<x<790 and 320<y<372,'fscR':lambda x,y:1355<x<1415 and 305<y<380}
sct=json.load(open('sctrack.json'))
scx=[]
for f in range(2577,2599):
    row=[]
    for k in (['scCL','scCR'] if f<2586 else ['scH1L','scH1R']):
        A=sct[k][str(f)][:6]
        row.append([k,round(A[0],4),round(A[3],4),round(A[1],4),round(A[4],4),round(A[2],2),round(A[5],2)])
    scx.append(row)
sm=json.load(open('smokefit.json'))
smoke=[]
for f in range(2577,2606):
    p=sm[str(f)]; row=[]
    for i in range(10):
        x,y,sx,sy,a=p[5*i:5*i+5]
        if a>0.004 and f<=2603: row+=[round(x),round(y),round(sx),round(sy),round(a,3)]
    smoke.append(row)
gl=json.load(open('glowfit.json'))
glow=[]
for f in range(2512,2763):
    vals=[gl[str(g)] for g in range(max(2512,f-1),min(2762,f+1)+1)]
    glow.append(round(min(1.6,max(0.9,float(np.median(vals)))),2))
dv=json.load(open('divetrack.json'))['dive']; ch=json.load(open('chtrack.json'))
def canv(A): return [round(A[0],4),round(A[3],4),round(A[1],4),round(A[4],4),round(A[2],2),round(A[5],2)]
chaos=[]
for f in range(2512,2566):
    if f<=2537: row=['dive']+canv(dv[str(f)][:6])
    elif f<=2541: row=['vs2']+canv(ch['vs2'][str(f)][:6])
    elif f<=2545: row=['vs3']+canv(ch['vs3'][str(f)][:6])
    elif f>=2559: row=['hov2']+canv(ch['hov2'][str(f)][:6])
    elif f>=2547: row=['hov']+canv(ch['hov'][str(f)][:6])
    elif f==2546: row=['dash84',1,0,0,1,0,0]
    else: row=None
    chaos.append(row)
et=json.load(open('etrack.json'))
win={'eTR':(2517,2533),'eSt':(2519,2532),'eFl':(2530,2533)}
echo=[]
for f in range(2512,2540):
    row=[]
    for k,(a,b) in win.items():
        if a<=f<=b and str(f) in et[k]: row.append([k]+canv(et[k][str(f)][:6]))
    echo.append(row)
g8=np.load('gain8.npy')
gain=''.join(chr(48+int(round((v-0.6)/1.2*74))) for v in g8.reshape(-1))   # 0.6..1.8 in 75 steps, one char each
ar=json.load(open('arcrows.json'))
slash=[ar.get(str(f),[]) for f in range(2512,2571)]
cj=json.load(open('chips.json'))
chipsrows=[]
for f in range(2513,2590):
    r=cj.get(str(f),[])
    chipsrows.append([v for c in r for v in [round(c[0]),round(c[1]),round(c[2]),round(c[3]),round(c[4],2),round(c[5],2)]])
spinrows=[]
last={'fscL':None,'fscR':None}
for f in range(2673,2716):
    row=[]
    for k in ['fscL','fscR']:
        x,y,th,sc=spin[str(f)][k]
        if sc<0.845 or not ok[k](x,y):
            if last[k] is None: x,y,th=(766,350,2.6) if k=='fscL' else (1380,338,0.3)
            else: x,y,th=last[k][0],last[k][1],last[k][2]+0.87
            sc=0
        last[k]=(x,y,th)
        row+= [round(x,1),round(y,1),round(th,3)]
    spinrows.append(row)
js=f'''// s25 timeline data, measured on the source (scratch scripts, not loaded by the film):
// CAM  : per source frame {F0}..{F1} (103.08–110.48) the camera drift of the page against 104.60 (ECC affine on the
//        page outside the owl), canvas order [a, b, c, d, e, f]; after 108.08 it includes the vertical squash.
// SCHED: per frame 2576..{F1} the traced drawing shown and its affine (trace frame -> this frame, in the 104.60 page
//        space; ECC on the drawing, residual in the fidelity notes), [key, a, b, c, d, e, f].
// SPIN : per frame 2673..2715 (106.92–108.60) the two thrown scissors: [Lx, Ly, Lrot, Rx, Ry, Rrot] = where the
//        pivot of the traced floating pair (fscL / fscR, 109.40) sits and its rotation from that drawing (rotation-
//        searched masked template match; unmatched frames continue the spin by 0.87 rad).
export const CAM_F0 = {F0};
export const CAM = {json.dumps(camrows,separators=(',',':'))};
export const SCHED_F0 = 2576;
export const SCHED = {json.dumps(schrows,separators=(',',':'))};
// SCX  : per frame 2577..2598 (103.08–103.92, the landing, rise and settle, when smoke hides the metal) the two held
//        scissors as separate traced layers (scCL/scCR from 103.08, scH1L/scH1R from 104.60) with their own affine
//        (rotation/scale-searched masked template match on edges + ECC refine), drawn over the body.
export const SCX_F0 = 2577;
export const SCX = {json.dumps(scx,separators=(',',':'))};
// SMOKE: per frame 2577..2605 (103.08–104.20) the landing dust, measured as the brightness it adds to the page
//        (pre-grade source minus the clean 104.60 frame, outside the owl) and fitted by 10 gaussian blobs per frame:
//        [x, y, sx, sy, amplitude, …] (least squares on an 8 px grid; residual ≈ 25 % of the signal, the wisps).
export const SMOKE_F0 = 2577;
export const SMOKE = {json.dumps(smoke,separators=(',',':'))};
// GLOW : per frame 2512..2762 the gain of the screen's light on the room (drawFramedPage glow), fitted so the
//        pre-grade wall above / left / right of the screen matches the ungraded source (median, 3-frame median filter).
export const GLOW_F0 = 2512;
export const GLOW = {json.dumps(glow,separators=(',',':'))};
// CHAOS_OWL: per frame 2512..2565 (100.48–102.60) the main owl in the chaos as a traced drawing and its affine:
//        'dive' (traced at 100.84) 100.48–101.48, 'vs2' (101.60) 101.52–101.64, 'vs3' (101.72) 101.68–101.80,
//        'hov' (102.12) 101.88–102.28, 'hov2' (102.48) 102.36–102.60 (rotation/scale-searched template match + ECC); 'dash84' traced at 101.84 itself.
export const CHAOS_F0 = 2512;
export const CHAOS_OWL = {json.dumps(chaos,separators=(',',':'))};
// ECHO : per frame 2512..2539 the other owls round the page in the dive (traced at 101.12 top right 'eTR',
//        100.88 left 'eSt', 101.20 bottom left 'eFl'), each on its tracked affine while it is visible.
export const ECHO_F0 = 2512;
export const ECHO = {json.dumps(echo,separators=(',',':'))};
// GAIN : the page's light in this shot against sokoPageCanvas (F1): ungraded source / our pre-grade render, owl
//        masked, over 10 standing frames, blurred σ45, owl hole inpainted; 276×118 grid of 8 frame px, one char per cell
//        (value = 0.6 + (code − 48) / 74 · 1.2). Baked into the page canvas once.
export const GAIN_W = 276, GAIN_H = 118;
export const GAIN = {json.dumps(gain)};
// SLASH: per frame 2512..2570 the white slash arcs, measured: bright wide strokes found by a 25 px top-hat, fitted by
//        ellipses refitted per frame (E1 100.64–101.20, E3/E3b 102.16–102.72, seeded by one fit over all their frames; the
//        right-hand arc 100.72–101.32 per frame from its own pixels), with the visible parameter intervals per frame: [cx, cy, a, b, rot, t0, t1,
//        width px, value].
export const SLASH_F0 = 2512;
export const SLASH = {json.dumps(slash,separators=(',',':'))};
// CHIPS: per frame 2513..2589 the paper chips seen in the source: small bright near-rectangles with a dark outline
//        that are not on the clean page, as rotated rects [cx, cy, w, h, angle, value, …] (frame px).
export const CHIPS_F0 = 2513;
export const CHIPS = {json.dumps(chipsrows,separators=(',',':'))};
export const SPIN_F0 = 2673;
export const SPIN = {json.dumps(spinrows,separators=(',',':'))};
'''
open(f'{D}/timeline.js','w').write(js)
print(len(js))
