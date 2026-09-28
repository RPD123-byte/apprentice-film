# render exact source frames k through the film: t = ceil(k*1.2)/30 + 0.0005 (the snapshot seek floors to 1/30 s)
import sys, subprocess, math, glob, re, os
out = sys.argv[1]; ks = [int(x) for x in sys.argv[2].split(',')]
os.makedirs(out, exist_ok=True)
for i in range(0, len(ks), 60):
    part = ks[i:i+60]
    tt = ','.join('%.4f' % (math.ceil(k * 1.2 - 1e-9) / 30 + 0.0005) for k in part)
    sub = out + '/raw%d' % i
    r = subprocess.run(['npx', '--yes', 'hyperframes@0.8.69', 'snapshot', '--at', tt, '--no-end', '--describe', 'false', '--timeout', '30000', '-o', sub],
                       cwd='/Users/computer/rootline/apprentice-film', capture_output=True, text=True)
    txt = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
    for l in txt.splitlines():
        if re.search('error|fail|warn|saved', l, re.I): print(l, flush=True)
    fs = sorted(glob.glob(sub + '/frame-*.png'), key=lambda p: int(re.search(r'frame-(\d+)', p).group(1)))
    for k, f in zip(part, fs): os.replace(f, out + '/r%05d.png' % k)
    for f in glob.glob(sub + '/*'): os.remove(f)
    os.rmdir(sub)
