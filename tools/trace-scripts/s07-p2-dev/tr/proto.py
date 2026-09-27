import cv2, numpy as np, json, time, sys
sys.path.insert(0,'.')
from ridge import trace
T = np.load('../T.npy')            # pre-grade target, BGR 0..1
g = (T.mean(axis=2)*255).astype(np.float32)
H, W = g.shape
t0=time.time()
base = cv2.medianBlur(np.clip(g,0,255).astype(np.uint8), 11).astype(np.float32)
base = cv2.GaussianBlur(base, (0,0), 2)
sig=float(sys.argv[1]) if len(sys.argv)>1 else 1.2
dk = trace(g, base, 'd', sig=sig, hi=5, lo=2.5)
bk = trace(g, base, 'b', sig=sig, hi=5, lo=2.5)
print('dark', len(dk), sum(len(s) for s in dk), 'bright', len(bk), sum(len(s) for s in bk), '%.1fs'%(time.time()-t0))
json.dump({'d':dk,'b':bk}, open('proto_strokes.json','w'))
def render(base, strokes, S=4):
  c = cv2.resize(base, (W*S, H*S), interpolation=cv2.INTER_LINEAR)
  for key in ('b','d'):
    for s in strokes[key]:
      for i in range(len(s)-1):
        x0,y0,w0,v0 = s[i]; x1,y1,w1,v1 = s[i+1]
        w = max(1, int(round((w0+w1)/2*S))); v = (v0+v1)/2*255
        cv2.line(c, (int(x0*S), int(y0*S)), (int(x1*S), int(y1*S)), float(v), w, cv2.LINE_8)
  return cv2.resize(c, (W, H), interpolation=cv2.INTER_AREA)
R = render(base, {'d':dk,'b':bk})
cv2.imwrite('proto_render.png', np.clip(R,0,255).astype(np.uint8))
for s in (0,2,4,8):
  A = cv2.GaussianBlur(R,(0,0),s) if s else R; B = cv2.GaussianBlur(g,(0,0),s) if s else g
  A0 = cv2.GaussianBlur(base,(0,0),s) if s else base
  print('sigma',s,'mae strokes+base %.2f   base only %.2f'%(np.abs(A-B).mean(), np.abs(A0-B).mean()))
