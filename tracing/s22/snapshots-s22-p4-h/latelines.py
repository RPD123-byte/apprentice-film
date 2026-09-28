# latelines.py RDIR: trace the fine lines of each late held drawing (medians of its source frames vs this render's)
import sys, re, cv2, numpy as np, json, subprocess, os
sys.path.insert(0, '.')
from run import src
txt = open('../../src/shots/s22.js').read()
LATE = eval(re.search(r'const LATE = (\[\[.*?\]\]);', txt, re.S).group(1).replace('\n', ''))
meta = json.loads(subprocess.run(['node', '-e', "import('../../src/shots/s22/owlData.js').then(m=>{const o={};for(const[k,v] of Object.entries(m.TRACED))o[k]={w:v.w,h:v.h,o:v.o};console.log(JSON.stringify(o))})"], capture_output=True, text=True).stdout)
rd = sys.argv[1]; S = 4; out = {}
REP = lambda F: F - 1 if (F % 25 == 5 and 1880 <= F <= 2005) else F
for i, (t0, name) in enumerate(LATE):
    if name in ('walk',): continue
    t1 = LATE[i + 1][0] if i + 1 < len(LATE) else 84.04
    if name == 'brand': t0 = 80.40
    Fs = sorted({REP(F) for F in range(int(round(t0 * 25)), int(round(t1 * 25)))})
    Fs = [F for F in Fs if os.path.exists(f'{rd}/r{F:04d}.png')]
    if not Fs: print(name, 'no frames'); continue
    m = meta[name]; x0, y0 = m['o'][0] - 8, m['o'][1] - 8; x1, y1 = m['o'][0] + m['w'] + 8, m['o'][1] + m['h'] + 8
    x0, y0 = max(0, x0), max(0, y0)
    def crop(im): return cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1].astype(np.float32), None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    sm = np.median(np.stack([crop(src(F)) for F in Fs]), 0); rm = np.median(np.stack([crop(cv2.imread(f'{rd}/r{F:04d}.png')) for F in Fs]), 0)
    if len(Fs) == 1: sm = cv2.GaussianBlur(sm, (0, 0), 2.0)   # one noisy frame: take the grain down first
    cv2.imwrite(f'../s22-p4-meas/late_{name}_s.png', np.clip(sm, 0, 255).astype(np.uint8)); cv2.imwrite(f'../s22-p4-meas/late_{name}_r.png', np.clip(rm, 0, 255).astype(np.uint8))
    # the crop's pixel (i, j) at S x: frame pixel-index x0 + (i + 0.5)/S - 0.5 -> tracer X0 = x0
    r = subprocess.run(['python3', '../../src/shots/s22/trace/trace_lines.py', f'../s22-p4-meas/late_{name}_s.png', f'../s22-p4-meas/late_{name}_r.png', f'../s22-p4-meas/late_{name}.json', f'../s22-p4-meas/late_{name}.jpg', str(x0), str(y0), str(S), '6', '3', '10', 'hp'], capture_output=True, text=True)
    print(name, len(Fs), 'frames', r.stdout.strip())
