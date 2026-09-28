#!/usr/bin/env python3
# pair.py OUTDIR k1,k2,... | kA-kB[:step]   render the exact source frames k (25 fps) and pair render|source
# render time = ceil(k*1.2)/30 + 0.0005 so the 1/30 renderer lands inside source frame k
import sys, subprocess, math, glob, re, os, cv2, numpy as np
SRC = os.path.dirname(os.path.abspath(__file__)) + '/src/%05d.png'
out = sys.argv[1]; spec = sys.argv[2]
ks = []
for part in spec.split(','):
    if '-' in part:
        a, b = part.split('-'); st = 1
        if ':' in b: b, st = b.split(':'); st = int(st)
        ks += list(range(int(a), int(b) + 1, st))
    else: ks.append(int(part))
ks = sorted(set(ks))
times = [math.ceil(k * 1.2 - 1e-9) / 30 + 0.0005 for k in ks]
raw = out + '/raw'
subprocess.run(['rm', '-rf', raw]); os.makedirs(out, exist_ok=True)
for i in range(0, len(ks), 60):
    tt = ','.join('%.4f' % t for t in times[i:i + 60])
    sub = raw + '/b%d' % i
    r = subprocess.run(['npx', '--yes', 'hyperframes@0.8.69', 'snapshot', '--at', tt, '--no-end', '--describe', 'false', '--timeout', '30000', '-o', sub],
                       cwd='/Users/computer/rootline/apprentice-film', capture_output=True, text=True)
    txt = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
    for l in txt.splitlines():
        if re.search('error|fail|warn', l, re.I): print(l)
    fs = sorted(glob.glob(sub + '/frame-*.png'), key=lambda p: int(re.search(r'frame-(\d+)', p).group(1)))
    for k, f in zip(ks[i:i + 60], fs):
        os.rename(f, out + '/r%05d.png' % k)
    subprocess.run(['rm', '-rf', sub])
for k in ks:
    a = cv2.imread(out + '/r%05d.png' % k); b = cv2.imread(SRC % k)
    if a is None: print('missing', k); continue
    cv2.imwrite(out + '/p%05d.jpg' % k, np.hstack([a, b]), [cv2.IMWRITE_JPEG_QUALITY, 85])
    ga = cv2.GaussianBlur(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    gb = cv2.GaussianBlur(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    print('k=%d t=%.2f MAE=%.1f' % (k, k / 25, np.abs(ga - gb).mean()))
