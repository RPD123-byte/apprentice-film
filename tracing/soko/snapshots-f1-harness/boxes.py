# boxes.py: bbox (page px) of every illustration layer painted alone on a transparent ground
import sys, json; sys.path.insert(0,'.')
from run import Lab, build
build('entry_dev.js','bundle_dev.js')
L=Lab('hd.html')
r=L.js('''() => { const {I}=F1; const out={};
  for (const name of I.SOKO_LAYERS) {
    const c=document.createElement('canvas'); c.width=1103; c.height=473; const g=c.getContext('2d', {willReadFrequently:true}); g.scale(0.5,0.5);
    I.paintSokoIll(g, {gaze:'owl', only:[name], background:false});
    const d=g.getImageData(0,0,1103,473).data; let x0=1e9,y0=1e9,x1=-1,y1=-1;
    for (let y=0;y<473;y++) for (let x=0;x<1103;x++) if (d[(y*1103+x)*4+3]>8) { if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    out[name]=[x0*2, y0*2, x1*2+2, y1*2+2];
  }
  return out; }''')
L.close()
print(json.dumps(r))
