import re,sys
sys.argv=['x']
exec(open('shards.py').read().replace("print(s[:4]","pass #"))
p='/Users/computer/rootline/apprentice-film/src/shots/s23/tracks.js'
t=open(p).read()
new=[]; changed=0
for s,old,onset,sc in out:
    k=old
    if onset is not None and onset>=2399 and onset!=old: k=onset; changed+=1
    new.append('[%d,%d,%d,%d,%.2f]'%(s[0],s[1],s[2],s[3],k/25))
arr='['+','.join(new)+']'
t2=re.sub(r'export const SHARDS = \[\[.*?\]\];','export const SHARDS = '+arr+';',t,count=1,flags=re.S)
assert t2!=t
t2=t2.replace("// source (top-hat + difference mask at 97.04, Hough segments, deduplicated); [x0, y0, x1, y1, first source frame seen].",
 "// source (top-hat + difference mask at 97.04, Hough segments, deduplicated); [x0, y0, x1, y1, first source frame seen].\n// Fix pass 1: every segment's onset re-measured on source frames 2396–2426 (median on-line brightness minus the max of\n// the ±6 px off-line samples ≥ 25 for 3 consecutive frames; snapshots/s23-fix1-tools/shards.py); lines that are page\n// edges already (onset ≤ 2396) keep their old date.")
open(p,'w').write(t2); print('changed',changed)
