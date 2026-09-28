import json, subprocess, sys
# usage: runfit.py stage.json Fin.json Fout.json
st = json.load(open(sys.argv[1])); F = json.load(open(sys.argv[2]))
st['F'] = F
out = subprocess.run(['node', 'ev.mjs', st.get('script', 'fitcut.js'), json.dumps(st)], capture_output=True, text=True, timeout=1800)
for l in out.stdout.splitlines():
    if l.startswith('{'):
        d = json.loads(l)
        print('before', d['before'], '\nafter ', d['after'], 'ms %.0f' % d['ms'])
        print(d['params'])
        print({k: [round(v, 1) for v in d['lm'][k]] for k in d['lm'] if k != 'cupR'})
        json.dump(d['F'], open(sys.argv[3], 'w'), indent=1)
    else: print(l[:400])
print(out.stderr[-2000:])
