import sys, json, cv2, numpy as np, importlib.util
sys.argv=['x','a','b','c','d','e','f','g','h','i']
src=open('/Users/computer/rootline/apprentice-film/src/shots/s02/trace/fit_widths.py').read().split("face_reg = (A")[0]
exec(src.replace("tr, dbg, gf, tf, g0, t0, g1, t1, out = sys.argv[1:10]","tr='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/trace4.json'; dbg='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/tr4'").replace("os.path.dirname(__file__)","'/Users/computer/rootline/apprentice-film/src/shots/s02/trace'"))
Bf = ig.paint_of(cv2.cvtColor(cv2.imread('snapshots/s02-lab-g/frame-00-at-0.5s.png'), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, 8.4)
J = ig.paint_of(cv2.cvtColor(cv2.imread('snapshots/s02-lab-j/frame-00-at-0.5s.png'), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, 8.4)
Rr = raster(Bf, [(R['dark'], np.ones(len(R['dark']))), (R['light'], np.ones(len(R['light'])))])
for n,(x0,y0,x1,y1) in {'hoodBand':(250,560,400,600),'cuffL':(620,60,700,140),'cheekL':(870,420,930,470),'nose':(1010,480,1090,560),'hoodW':(300,700,420,790)}.items():
    print(n, 'ground %.3f  jsRender %.3f  pyRaster %.3f  target %.3f'%(Bf[y0:y1,x0:x1].mean(), J[y0:y1,x0:x1].mean(), Rr[y0:y1,x0:x1].mean(), A[y0:y1,x0:x1].mean()))
cv2.imwrite('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/chk.png', np.clip(np.hstack([J[500:650,200:500], Rr[500:650,200:500], A[500:650,200:500]])*255,0,255).astype(np.uint8))
