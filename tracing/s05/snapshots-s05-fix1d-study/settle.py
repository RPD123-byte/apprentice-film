# decode src/shots/s05/data/settle.js (measured camera-settle grids) for measurement scripts
import re, json, numpy as np
P='/Users/computer/rootline/apprentice-film/src/shots/s05/data/settle.js'
def decode(s):
    out=[]; i=0
    while i<len(s):
        z=0; sh=0
        while True:
            b=ord(s[i])-63; i+=1; z+=(b&0x1f)*(2**sh); sh+=5
            if b<0x20: break
        out.append(-(z+1)//2 if z%2 else z//2)
    return out
def load():
    t=open(P).read()
    ks=json.loads(re.search(r'export const KS = (\[[^\]]*\])',t).group(1))
    F={}
    for m in re.finditer(r'(\w+): \{ x0: (-?\d+), y0: (-?\d+), G: (\d+), nx: (\d+), ny: (\d+),\s*d: \[(.*?)\] \}',t,re.S):
        n=m.group(1); x0,y0,G,nx,ny=[int(m.group(i)) for i in range(2,7)]
        ds=re.findall(r'"((?:[^"\\]|\\.)*)"',m.group(7))
        ds=[json.loads('"'+d+'"') for d in ds]
        F[n]=dict(x0=x0,y0=y0,G=G,nx=nx,ny=ny,d=[np.array(decode(d),float).reshape(ny,nx,2)/10 for d in ds])
    return ks,F
if __name__=='__main__':
    ks,F=load()
    for n,f in F.items():
        print(n,f['x0'],f['y0'],f['G'],f['nx'],f['ny'],'domain x',f['x0'],f['x0']+f['G']*(f['nx']-1),'y',f['y0'],f['y0']+f['G']*(f['ny']-1))
        for k,d in zip(ks,f['d']):
            print('  ',k,'dx %.0f..%.0f dy %.0f..%.0f'%(d[...,0].min(),d[...,0].max(),d[...,1].min(),d[...,1].max()))
