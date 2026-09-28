#!/usr/bin/env python3
# pair.py OUTDIR spec : render exact source frames k (ceil(k*1.2)/30+0.0005) and pair render|source (vertical), MAE8
import sys, subprocess, math, glob, re, os, cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23rev2'
def src(k): return cv2.imread(f'{SP}/src/{k:05d}.png')
out = sys.argv[1]; spec = sys.argv[2]; norender = len(sys.argv) > 3
ks = []
for part in spec.split(','):
    if '-' in part:
        a, b = part.split('-'); st = 1
        if ':' in b: b, st = b.split(':'); st = int(st)
        ks += list(range(int(a), int(b) + 1, st))
    else: ks.append(int(part))
ks = sorted(set(ks))
times = [math.ceil(k * 1.2 - 1e-9) / 30 + 0.0005 for k in ks]
os.makedirs(out, exist_ok=True)
if not norender:
  raw = out + '/raw'; subprocess.run(['rm', '-rf', raw])
  for i in range(0, len(ks), 60):
    tt = ','.join('%.4f' % t for t in times[i:i + 60])
    sub = raw + '/b%d' % i
    r = subprocess.run(['npx', '--yes', 'hyperframes@0.8.69', 'snapshot', '--at', tt, '--no-end', '--describe', 'false', '--timeout', '30000', '-o', sub],
                       cwd='/Users/computer/rootline/apprentice-film', capture_output=True, text=True)
    txt = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
    for l in txt.splitlines():
        if re.search('error|fail|warn', l, re.I): print(l)
    fs = sorted(glob.glob(sub + '/frame-*.png'), key=lambda p: int(re.search(r'frame-(\d+)', p).group(1)))
    for k, f in zip(ks[i:i + 60], fs): os.rename(f, out + '/r%05d.png' % k)
    subprocess.run(['rm', '-rf', sub])
  subprocess.run(['rm', '-rf', raw])
tot = []
for k in ks:
    a = cv2.imread(out + '/r%05d.png' % k); b = src(k)
    if a is None: print('missing', k); continue
    cv2.imwrite(out + '/p%05d.jpg' % k, cv2.resize(np.vstack([a, b]),(1103,946)), [cv2.IMWRITE_JPEG_QUALITY, 85])
    ga = cv2.GaussianBlur(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    gb = cv2.GaussianBlur(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 8)
    e = np.abs(ga - gb).mean(); tot.append(e)
    print('k=%d t=%.2f MAE8=%.2f' % (k, k / 25, e))
if tot: print('mean %.2f over %d' % (np.mean(tot), len(tot)))
