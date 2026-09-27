#!/usr/bin/env python3
# tojs_all.py -- rewrite every key module src/shots/s04/tk/kNNNN.js from tr/dNN.NN.json, then check each module's
# time matches its name.
import glob, os, re, subprocess, json
from concurrent.futures import ThreadPoolExecutor
TK = "../../src/shots/s04/tk"
names = sorted(re.match(r"k(\d{4})\.js", os.path.basename(p)).group(1) for p in glob.glob(TK + "/k*.js") if re.match(r"k\d{4}\.js", os.path.basename(p)))
def one(n):
    t = n[:2] + "." + n[2:]
    r = subprocess.run(["python3", "tr/tojs_d.py", f"tr/d{t}.json", f"{TK}/k{n}.js", f"K{n}"], capture_output=True, text=True)
    return n, r.returncode, r.stderr[-200:]
with ThreadPoolExecutor(8) as ex:
    for n, rc, err in ex.map(one, names):
        if rc: print("FAIL", n, err)
bad = []
for n in names:
    s = open(f"{TK}/k{n}.js").read(2000)
    m = re.search(r'export const K(\d{4}) = \{"enc":3,"t":([\d.]+)', s)
    if not m or m.group(1) != n or abs(float(m.group(2)) - int(n) / 100) > 1e-6: bad.append((n, m.groups() if m else None))
print(len(names), "modules; bad:", bad)
