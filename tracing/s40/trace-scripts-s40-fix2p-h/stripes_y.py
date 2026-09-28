import numpy as np, cv2, re, sys, json
exec(open('stripes.py').read().split("names=['dark'")[0])
names=['dark','red','peach','cream','peach2','red2','dark2']
BIN=int(sys.argv[2]) if len(sys.argv)>2 else 40
out={}
for k,Bk in B.items():
    upper={'leftB':'leftA','rightB':'rightA'}.get(k)
    acc={}
    for y in range(int(max(0,Bk[0,0])),int(min(945,Bk[-1,0]))):
        xs=xs_at(Bk,y); cov=xs_at(B[upper],y) if upper else None
        for i in range(7):
            x0,x1=xs[i]+3,xs[i+1]-3
            for x in range(int(np.ceil(x0)),int(np.floor(x1))+1):
                if x<0 or x>=2206 or not rib[y,x]: continue
                if cov is not None and cov[0]-6<=x<=cov[7]+6: continue
                p=raw[y,x]/255; h=hb[y,x]; hh=1-(1-p)*(1-0.5*h); gn=(0.65+2.1*hh*(1-hh))*(1-0.5*h)*vig[y,x]
                acc.setdefault((i,y//BIN),[]).append(np.concatenate([r[y,x]-s[y,x],gn]))
    print(k)
    res={}
    for i in range(7):
        line=[]
        for yb in range(0,946//BIN+1):
            v=acc.get((i,yb))
            if not v or len(v)<40: continue
            v=np.array(v); d=v[:,:3].mean(0)[::-1]; g=v[:,3:].mean(0)[::-1]; dp=-d/g
            res.setdefault(i,[]).append((yb*BIN+BIN//2,[round(float(q),1) for q in dp]))
            line.append(f'{yb*BIN+BIN//2}:({d[0]:+.0f},{d[1]:+.0f},{d[2]:+.0f})')
        if line: print(f'  {names[i]:6s}',' '.join(line))
    out[k]=res
json.dump(out,open('stripes_y.json','w'))
