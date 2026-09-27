# layerratio.py fills.json renderdir times : per-layer visible-region mean luma render/source per frame
import json, sys, cv2, numpy as np, glob, re
exec(open('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/tone.py').read().split('fills=sorted')[0].replace("F=json.load(open(sys.argv[1])); rd=sys.argv[2]; outp=sys.argv[3]","F=json.load(open(sys.argv[1])); rd=sys.argv[2]").replace("sys.argv[4].split(',') if len(sys.argv)>4","sys.argv[3].split(',') if len(sys.argv)>3"))
fills=sorted(F['fills'],key=lambda f:(order.index(f['layer']),f['idx']))
print('t      '+' '.join(f'{n:>13}' for n in order))
for t in times:
    d=DOLLY[int(round((t-40.0)/0.04))]; TT[0]=t
    fs=glob.glob(f'{rd}/frame-*-at-{t:g}s.png')
    A=cv2.cvtColor(cv2.imread(fs[0]),cv2.COLOR_BGR2GRAY).astype(float); B=cv2.cvtColor(cv2.imread(fs[0].replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(float)
    idx=np.full(A.shape,-1,np.int32)
    for i,f in enumerate(fills):
        polys=[np.round(mapp(s,planes[f['layer']],d,f['layer'])*4).astype(np.int32) for s in f['subs']]
        if polys:
            m=np.zeros(A.shape,np.uint8); cv2.fillPoly(m,polys,1,shift=2); idx[m>0]=order.index(f['layer'])
    hx,top,s=BK[round(t,2)]
    idx[max(0,int(top-30*s)):int(top+300*s), max(0,int(hx-200*s)):int(hx+200*s)]=-1
    out=[]
    for k,n in enumerate(order):
        m=idx==k
        out.append(f'{A[m].mean():5.0f}/{B[m].mean():<5.0f}{m.sum()//1000:>3}' if m.sum()>2000 else '      .      ')
    print(f'{t:.2f} '+' '.join(out))
