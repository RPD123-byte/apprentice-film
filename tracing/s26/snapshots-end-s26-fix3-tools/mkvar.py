# mkvar.py TAG [name=/abs/path.js ...]: a scratch copy of src/shots/s26.js for the harness (absolute imports), with the
# named s26/ data modules swapped for variants (e.g. owlTraceF=/snapshots/end-s26-fix3-tools/var/owlTraceF_pt1.js)
import sys, os, re
ROOT = '/Users/computer/rootline/apprentice-film/'
tag = sys.argv[1]; sw = dict(a.split('=', 1) for a in sys.argv[2:])
s = open(ROOT + 'src/shots/s26.js').read()
s = s.replace('"./s26/', '"/src/shots/s26/').replace('"../lib/', '"/src/lib/').replace('"../config.js"', '"/src/config.js"')
for k, v in sw.items(): s = s.replace(f'"/src/shots/s26/{k}.js"', f'"{v}"')
os.makedirs(ROOT + 'snapshots/end-s26-fix3-tools/var', exist_ok=True)
open(ROOT + f'snapshots/end-s26-fix3-tools/var/s26_{tag}.js', 'w').write(s)
print(f'/snapshots/end-s26-fix3-tools/var/s26_{tag}.js')
