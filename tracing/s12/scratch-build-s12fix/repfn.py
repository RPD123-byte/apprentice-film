# replace whole top-level functions in hero.js with the versions in fn/*.js (file name = function name)
import re, sys, glob, os
p='/Users/computer/rootline/apprentice-film/src/shots/s12/hero.js'
s=open(p).read()
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__),'fn','*.js'))):
    name=os.path.basename(f)[:-3]; new=open(f).read().rstrip()+'\n'
    m=re.search(r'^(export )?function '+re.escape(name)+r'\(', s, re.M)
    if not m: print('NOT FOUND',name); sys.exit(1)
    end=s.index('\n}\n', m.start())+3
    s=s[:m.start()]+new+s[end:]
    print('replaced',name)
open(p,'w').write(s)
for f in glob.glob(os.path.join(os.path.dirname(__file__),'fn','*.js')): os.remove(f)
