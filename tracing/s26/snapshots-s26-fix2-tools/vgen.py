#!/usr/bin/env python3
# scratch: copy src/shots/s26.js to a measurement variant (absolute import paths + options read from the module URL:
# ?noowl=1 drops the owl, ghost, scissors and lens shard). Usage: vgen.py OUT.js
import sys, re
R = '/Users/computer/rootline/apprentice-film'
s = open(f'{R}/src/shots/s26.js').read()
s = s.replace('"../lib/', '"/src/lib/').replace('"./s26/', '"/src/shots/s26/').replace('"./s25/', '"/src/shots/s25/').replace('"../config.js"', '"/src/config.js"')
s = s.replace('const mk = (w, h)', 'const OPT = new URL(import.meta.url).searchParams;\nconst mk = (w, h)', 1)
s = s.replace('  owlGhost(ctx, t);\n  flungScissors(ctx, t);\n  ctx.drawImage(owlCD(t), 0, 0);', '  if (!OPT.get("noowl")) { owlGhost(ctx, t);\n  flungScissors(ctx, t);\n  ctx.drawImage(owlCD(t), 0, 0); }')
s = s.replace('paintD(ctx, t); paintSlab(ctx, t); return;', 'paintD(ctx, t); if (!OPT.get("noowl")) paintSlab(ctx, t); return;')
open(sys.argv[1], 'w').write(s)
