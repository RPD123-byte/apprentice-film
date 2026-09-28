import re, subprocess, sys
p='/Users/computer/rootline/apprentice-film/src/shots/s08.js'
variants=[l.split() for l in sys.argv[1:]]
for v in variants:
    s=open(p).read()
    ow,oo,oa,fr,cr,dx,dy=v
    s=re.sub(r'const SEL_P = \{[^}]*\};',f'const SEL_P = {{ ow: {ow}, oo: {oo}, oa: {oa}, fr: {fr}, cr: {cr}, dx: {dx}, dy: {dy} }};',s); open(p,'w').write(s)
    subprocess.run(['node','snapshots/s08-f3-tools/r.mjs','snapshots/s08-f3-sel','764'],capture_output=True)
    out=subprocess.run(['python3','snapshots/s08-f3-tools/selerr.py','snapshots/s08-f3-sel/r764.png'],capture_output=True,text=True).stdout.strip()
    print(' '.join(v),':',out, flush=True)
