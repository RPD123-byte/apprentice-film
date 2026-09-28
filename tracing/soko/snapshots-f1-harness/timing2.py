import sys; sys.path.insert(0,'.')
from run import Lab, build
build('entry_dev.js','bundle_dev.js')
L=Lab('hd.html')
print(L.js('''() => { const {S,I}=F1; const r={}; let t=performance.now();
  S.sokoPageCanvas({gaze:'owl'}); r.page1=performance.now()-t; t=performance.now();
  S.sokoPageCanvas({gaze:'owl', ui:false}); r.variant1=performance.now()-t; t=performance.now();
  S.sokoPageCanvas({gaze:'owl', scale:2}); r.page2=performance.now()-t; t=performance.now();
  S.sokoPageCanvas({gaze:'owl', scale:2, ui:false}); r.variant2=performance.now()-t; t=performance.now();
  S.sokoHeaderCanvas({gaze:'down'}); r.headerDown=performance.now()-t;
  for (const k in r) r[k]=Math.round(r[k]); return r; }'''))
L.close()
