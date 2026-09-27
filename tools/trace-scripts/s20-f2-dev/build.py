import sys
h=open('head.html').read()
for f in sys.argv[1:]:
    open(f.replace('.src.html','.built.html'),'w').write(open(f).read().replace('<!--#include head-->',h))
