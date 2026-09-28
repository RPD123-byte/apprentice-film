#!/usr/bin/env python3
# mkvar.py TAG [--owlF data.json] [--owlCD data.json] [--sub 'old=>new' ...]: a scratch copy of src/shots/s26.js
# (absolute imports) with some data modules swapped for test traces, loaded by the harness as ?shot=... (not the film)
import sys, re, json, subprocess, os
T = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/'
a = sys.argv[1:]; tag = a[0]
s = open('/Users/computer/rootline/apprentice-film/src/shots/s26.js').read()
s = s.replace('from "../lib/', 'from "/src/lib/').replace('from "./s26/', 'from "/src/shots/s26/').replace('from "./s25/', 'from "/src/shots/s25/').replace('from "../config.js"', 'from "/src/config.js"')
def swap(mod, name, js):
    global s
    pat = f'from "/src/shots/s26/{mod}.js"'
    assert pat in s, pat
    s = s.replace(pat, f'from "/snapshots/end-s26-fix2-tools/tv/{os.path.basename(js)}"')
i = 0
while i < len(a):
    if a[i] in ('--owlF', '--owlCD', '--lens'):
        mod, name = {'--owlF': ('owlTraceF', 'OWL_F'), '--owlCD': ('owlTraceCD', 'OWL_CD'), '--lens': ('lensTraceE', 'LENS_E')}[a[i]]
        src = a[i + 1]; js = src.replace('.json', f'_{name}.js')
        subprocess.run(['python3', T + '../end-s26-fix1-tools/export_js.py', src, js, name, 'scratch test data'], check=True, capture_output=True)
        swap(mod, name, js); i += 2
    elif a[i] == '--sub':
        o_, n_ = a[i + 1].split(' ~~> '); assert o_ in s, o_; s = s.replace(o_, n_); i += 2
    else: i += 1
open(T + f'tv/s26_{tag}.js', 'w').write(s)
print(f'/snapshots/end-s26-fix2-tools/tv/s26_{tag}.js')
