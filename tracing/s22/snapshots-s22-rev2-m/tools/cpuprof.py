# cpuprof.py T0 T1 ...: CDP sampling profile of warm s22 frames (raw, no grade); prints top functions by self and total time
import sys, collections
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import build, Lab
L = Lab(build('entry.js', 'bundle.js'))
ts = [float(v) for v in sys.argv[1:]]
for t in ts: L.p.evaluate('(t) => window.R(t, {raw: true}).ms', t)   # warm caches
cdp = L.p.context.new_cdp_session(L.p)
cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 200}); cdp.send('Profiler.start')
tot = 0
for rep in range(3):
    for t in ts: tot += L.p.evaluate('(t) => { const T0 = performance.now(); window.R(t + 0.001, {raw: true}); return performance.now() - T0; }', t)
prof = cdp.send('Profiler.stop')['profile']
nodes = {n['id']: n for n in prof['nodes']}
parent = {}
for n in prof['nodes']:
    for c in n.get('children', []): parent[c] = n['id']
dt = collections.Counter()
for s, d in zip(prof['samples'], prof['timeDeltas']): dt[s] += d
selfT = collections.Counter(); totT = collections.Counter()
def name(n): cf = n['callFrame']; return f"{cf['functionName'] or '(anon)'}:{cf['lineNumber']}"
for nid, d in dt.items():
    selfT[name(nodes[nid])] += d
    seen = set(); x = nid
    while x in nodes:
        nm = name(nodes[x])
        if nm not in seen: totT[nm] += d; seen.add(nm)
        x = parent.get(x)
    
N = 3 * len(ts)
print(f'wall per frame {tot / N:.0f} ms')
print('SELF (ms/frame):'); [print(f'  {v / 1000 / N:7.1f}  {k}') for k, v in selfT.most_common(22)]
print('TOTAL (ms/frame):'); [print(f'  {v / 1000 / N:7.1f}  {k}') for k, v in totT.most_common(30)]
L.close()
