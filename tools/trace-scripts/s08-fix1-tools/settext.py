import re,sys
p='/Users/computer/rootline/apprentice-film/src/shots/s08.js'
s=open(p).read()
bl,c1,c2=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
s=re.sub(r'(g.scale\(1, v\); \};\n  g.filter = "blur\()[0-9.]+(px\)";)',r'\g<1>'+bl+r'\g<2>',s)
s=re.sub(r'(DATE1 = \{ k: 1.0218, dy: 0.45, v: 1.06, col: )"rgb\(\d+,\d+,\d+\)"',r'\g<1>"rgb(%d,%d,%d)"'%(c1,c1+2,c1-8),s)
s=re.sub(r'(DATE2 = \{ k: 1.0525, dy: 2.0, v: 1.03, col: )"rgb\(\d+,\d+,\d+\)"',r'\g<1>"rgb(%d,%d,%d)"'%(c2,c2+2,c2-8),s)
open(p,'w').write(s)
