import sys, hashlib; sys.path.insert(0,'.')
from run import Lab, build
build('entry_dev.js','bundle_dev.js')
hs=[]
for order in (['down','owl'],['owl','down']):
    L=Lab('hd.html')
    r=L.js('''async (order) => { const {I,S}=F1; const out={};
      for (const gz of order) { const c=I.sokoIllCanvas({gaze:gz}); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let h=0; for (let i=0;i<d.length;i+=7) h=(h*31+d[i])>>>0; out[gz]=h; }
      const p=S.sokoPageCanvas({gaze:'owl'}); const d=p.getContext('2d').getImageData(0,0,p.width,p.height).data; let h=0; for (let i=0;i<d.length;i+=7) h=(h*31+d[i])>>>0; out.page=h;
      return out; }''', order)
    L.close(); hs.append(r); print(order, r)
print('identical:', hs[0]==hs[1])
