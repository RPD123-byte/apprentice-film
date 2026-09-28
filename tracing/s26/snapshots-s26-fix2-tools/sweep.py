#!/usr/bin/env python3
# scratch A/B driver: for each variant, apply string replacements to a file (from its current content), render the
# frames with the s26 harness, print the mean, then restore the file. Usage: sweep.py FILE FRAMES 'old=>new|||old2=>new2' ...
import sys, subprocess, re, shutil
R = '/Users/computer/rootline/apprentice-film'
f, frames = sys.argv[1], sys.argv[2]
orig = open(f'{R}/{f}').read()
try:
    for k, spec in enumerate(sys.argv[3:]):
        s = orig
        for pair in spec.split('|||'):
            if not pair: continue
            a, b = pair.split('=>')
            assert a in s, f'not found: {a}'
            s = s.replace(a, b)
        open(f'{R}/{f}', 'w').write(s)
        out = subprocess.run(['sh', f'{R}/snapshots/s26-fix2-tools/r.sh', f'sw{k}', frames], capture_output=True, text=True, timeout=900).stdout
        m = re.search(r'mean ([\d.]+)', out)
        print(f'[{k}] {spec[:90]} -> {m.group(1) if m else "FAIL " + out[-300:]}', flush=True)
finally:
    open(f'{R}/{f}', 'w').write(orig)
