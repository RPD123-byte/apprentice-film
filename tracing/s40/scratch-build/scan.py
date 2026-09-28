import sys
sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad')
from band3 import cls, runs
mode=sys.argv[1]; a0,a1,astep=[int(v) for v in sys.argv[2:5]]; b0,b1=[int(v) for v in sys.argv[5:7]]
for a in range(a0,a1,astep):
    s=''.join(cls(b,a) if mode=='row' else cls(a,b) for b in range(b0,b1))
    rs=[r for r in runs(s,0) if r[2]-r[1]>=3 or r[0]=='M']
    print(a,' '.join('%s%d-%d'%(r[0],r[1]+b0,r[2]+b0-1) for r in rs if r[0]!='o'))
