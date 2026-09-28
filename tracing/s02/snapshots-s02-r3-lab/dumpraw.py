# dump a raw (pre-grade) layer render: dumpraw.py ENTRY FRAME OUT [JSON for window.ONLY] [notone]
import sys, os, json, cv2
entry, f, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
only = sys.argv[4] if len(sys.argv) > 4 else '{}'; notone = len(sys.argv) > 5
os.environ['ENTRY'] = entry; sys.argv = [sys.argv[0]]
from run import Lab
L = Lab(); L.js('(a)=>{ if (a[1]) globalThis.__NOTONE = true; window.ONLY = JSON.parse(a[0]); }', [only, notone])
img, _ = L.frame(f, False); cv2.imwrite(out, img); L.close()
