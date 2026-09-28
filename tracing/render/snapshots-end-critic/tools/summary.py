import json, numpy as np
D='/Users/computer/rootline/apprentice-film/snapshots/end-critic/'
m={int(k):v for k,v in json.load(open(D+'metrics_every_frame.json')).items()}
SH=[('s23',84.04,97.08),('s24',97.08,100.48),('s25',100.48,110.52),('s26',110.52,117.52),('s27',117.52,129.30),('s28',129.30,136.00),('s40',136.00,140.64)]
import math
out=[]
out.append('shot   frames | NOW mad4 / mad12 / dE4 / dE12 | BASE mad4 / mad12 / dE4 / dE12 | NOW-vs-BASE(s4) | frames NOW worse than BASE by >0.5 (mad4)')
for sid,a,b in SH:
    ns=[n for n in m if a<=n/25+1e-9<b]
    if not ns: continue
    g=lambda k: np.mean([m[n][k] for n in ns])
    worse=[n for n in ns if m[n]['now_mad4']>m[n]['base_mad4']+0.5]
    out.append(f"{sid} {len(ns):4d} | {g('now_mad4'):5.2f} / {g('now_mad12'):5.2f} / {g('now_de4'):5.2f} / {g('now_de12'):5.2f} | {g('base_mad4'):5.2f} / {g('base_mad12'):5.2f} / {g('base_de4'):5.2f} / {g('base_de12'):5.2f} | {g('now_vs_base4'):5.2f} | {len(worse)}"+ (f" ({worse[0]/25:.2f}..{worse[-1]/25:.2f})" if worse else ''))
# 1-s windows
out.append('\nper 1-s window (NOW mad4 / BASE mad4 ; NOW dE4 / BASE dE4):')
for s in range(84,141):
    ns=[n for n in m if s<=n/25<s+1]
    if not ns: continue
    g=lambda k: np.mean([m[n][k] for n in ns])
    out.append(f"{s:3d}-{s+1}: {g('now_mad4'):5.2f} / {g('base_mad4'):5.2f} ; {g('now_de4'):5.2f} / {g('base_de4'):5.2f}")
# cuts
out.append('\ncuts (NOW mad4 / BASE mad4):')
for c in [2427,2512,2763,2938,3233,3400]:
    out.append(f"cut {c/25:.2f}: "+'  '.join(f"{n/25:.2f}:{m[n]['now_mad4']:.1f}/{m[n]['base_mad4']:.1f}" for n in range(c-3,c+3) if n in m))
# worst NOW frames
w=sorted(m,key=lambda n:-m[n]['now_mad4'])[:15]
out.append('\nworst NOW frames (mad4): '+', '.join(f"{n/25:.2f}:{m[n]['now_mad4']:.1f}" for n in sorted(w)))
# spike detection: frames where NOW error jumps vs neighbours while source doesn't
sp=[]
for n in m:
    if n-1 in m and n+1 in m:
        d=m[n]['now_mad4']-(m[n-1]['now_mad4']+m[n+1]['now_mad4'])/2
        if d>2.0: sp.append((n,d))
out.append('single-frame error spikes (>2 above neighbours): '+', '.join(f"{n/25:.2f}(+{d:.1f})" for n,d in sorted(sp)))
open(D+'metrics_summary.txt','w').write('\n'.join(out)); print('\n'.join(out))
