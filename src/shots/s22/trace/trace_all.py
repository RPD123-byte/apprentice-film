# re-trace every late-phase drawing (the edge drawing: trace_edge.py)
import sys; sys.path.insert(0,__import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from late import *
only=sys.argv[1:] or None
PR=np.load(S+'/plate_rest.npy')
def grow(q,d=3):
    c=np.mean(q,0); return [(x+np.sign(x-c[0])*d,y+np.sign(y-c[1])*d) for x,y in q]
def run(name,fn):
    if only and name not in only: return
    fn()
# flight 79.80-80.04
TOPS={79.80:160,79.84:148,79.88:139,79.92:148,79.96:161,80.00:174,80.04:186}
BOX={79.80:(10,0,280,290),79.84:(60,0,330,230),79.88:(100,0,380,150),79.92:(120,0,380,160),79.96:(150,0,390,160),80.00:(170,0,400,170),80.04:(190,0,430,185)}
for t,(x0,y0,x1,y1) in BOX.items():
    def f(t=t,x0=x0,y0=y0,x1=x1,y1=y1):
        top=TOPS[t]; keep=[[(-10,-10),(700,-10),(700,top-3),(191,top-3),(191,400),(-10,400)]]
        trace_frame(pre(t)[y0:y1,x0:x1],PLATE[y0:y1,x0:x1],keep=keep,name='f%.2f'%t,origin=(x0,y0),rough_thr=0.4,thr=0.2)
    run('f%.2f'%t,f)
# brandish hold (median of 80.08-80.52 aligned on 80.40)
def fb():
    ts=[80.08,80.12,80.16,80.24,80.28,80.32,80.36,80.4,80.44,80.48,80.52]
    al=align(ts,(200,0,450,172),80.4); v,p=median_of(al,(200,0,450,180))
    trace_frame(v,p,name='brand',origin=(200,0),cut_below=lambda x: 178+0*x,rough_thr=0.4,thr=0.2,meta={'off':[[round(a[0],2),round(a[1],2),round(a[2],2)] for a in al]})
run('brand',fb)
# swing smear
BOX={80.56:(130,0,450,182),80.60:(130,0,450,182),80.64:(130,0,450,182),80.68:(130,0,450,182),80.72:(110,10,440,184),80.76:(110,10,440,186)}
for t,(x0,y0,x1,y1) in BOX.items():
    def f(t=t,x0=x0,y0=y0,x1=x1,y1=y1):
        trace_frame(pre(t)[y0:y1,x0:x1],PLATE[y0:y1,x0:x1],name='f%.2f'%t,origin=(x0,y0),rough_thr=0.4,thr=0.2,cut_below=lambda x: 181+0*x)
    run('f%.2f'%t,f)
# throw / facing / reach (strip at rest)
BOX={80.80:(0,20,420,230),80.88:(190,20,420,200),80.96:(200,20,420,205),81.04:(210,20,420,205),81.12:(210,20,420,205),81.20:(160,40,410,215),81.28:(150,40,400,215),81.44:(160,40,410,215),81.52:(190,20,440,215)}
CARD={81.44:[(196,185),(203,184),(204,361),(197,362)],81.52:[(237,185),(270,170),(315,345),(267,364)]}
for t,(x0,y0,x1,y1) in BOX.items():
    def f(t=t,x0=x0,y0=y0,x1=x1,y1=y1):
        excl=[grow(CARD[t])] if t in CARD else []
        trace_frame(pre(t)[y0:y1,x0:x1],PR[y0:y1,x0:x1],excl=excl,name='f%.2f'%t,origin=(x0,y0),rough_thr=0.4,thr=0.2)
    run('f%.2f'%t,f)
def f8160():
    t=81.60; x0,y0,x1,y1=300,20,520,200
    q=grow([(264.6,183.7),(342.7,155.7),(386.0,322.5),(291.8,361.7)])
    trace_frame(pre(t)[y0:y1,x0:x1],PLATE[y0:y1,x0:x1],excl=[q],name='f81.60',origin=(x0,y0),rough_thr=0.4,thr=0.2,cut_below=lambda x: 181+0*x)
run('f81.60',f8160)
def fwalk():
    med=np.load(S+'/walk_med.npy')
    excl=[[(-60,94),(13,94),(18,99),(30,160),(30,230),(-60,230)]]
    Wp=json.load(open(S+'/walk_warp.json'))
    trace_frame(med,np.zeros_like(med),excl=excl,name='walk',origin=(-40,-30),rough_thr=0.5,thr=0.2,use_plate=False,cut_below=lambda x: np.where(x<62,148.5,141.0),
                meta={'warp':{k:[round(v[0][0],5),round(v[1][0],5),round(v[0][1],5),round(v[1][1],5),round(v[0][2],2),round(v[1][2],2)] for k,v in Wp.items() if float(k)>81.7}})
run('walk',fwalk)
def f8396():
    t=83.96; x0,y0,x1,y1=1380,40,1700,235
    excl=[[(1380,151),(1506,150),(1523,300),(1380,300)],[(1500,176),(1531,176),(1531,191),(1500,191)],[(1636,174),(1700,174),(1700,193),(1636,193)]]
    pl=PLATE.copy(); pl[181:]=0.03
    trace_frame(pre(t)[y0:y1,x0:x1],pl[y0:y1,x0:x1],excl=excl,name='f83.96',origin=(x0,y0),rough_thr=0.4,thr=0.2)
run('f83.96',f8396)
