import json
A=json.load(open('arcfit.json')); T=json.load(open('arcs_2515.json'))
rows={}
for f in range(2512,2571):
    r=[]
    for k,t0,t1,w,v in A['frames'].get(str(f),[]):
        if k=='E2': continue
        cx,cy,a,b,t=A['pf'][str(f)][k]; r.append([round(cx,1),round(cy,1),round(a,1),round(b,1),round(t,4),t0,t1,w,v])
    for comp in T.get(str(f),[]):
        cx,cy,a,b,t,t0,t1,w,v=comp
        if cx>1200 and 2518<=f<=2533: r.append([cx,cy,a,b,t,t0,t1,w,v])
    rows[f]=r
json.dump(rows,open('arcrows.json','w'))
