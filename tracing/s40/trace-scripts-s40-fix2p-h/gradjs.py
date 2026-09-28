import json, numpy as np
d=json.load(open('stripes_y.json'))
js='export const RIB_GRAD = {\n'
for band,res in d.items():
    js+=f'  {band}: {{\n'
    for i,bins in sorted(res.items(), key=lambda t:int(t[0])):
        ys=[b[0] for b in bins]; v=np.array([b[1] for b in bins])
        if len(v)>=3:
            sm=v.copy(); sm[1:-1]=0.25*v[:-2]+0.5*v[1:-1]+0.25*v[2:]; sm[0]=0.67*v[0]+0.33*v[1]; sm[-1]=0.67*v[-1]+0.33*v[-2]
        else: sm=v
        sm=np.clip(sm,-24,24)
        js+=f'    {i}: [' + ', '.join(f'[{y}, {a:.0f}, {b:.0f}, {c:.0f}]' for y,(a,b,c) in zip(ys,sm)) + '],\n'
    js+='  },\n'
js+='};\n'
open('ribgrad.js','w').write(js); print(js[:1500])
