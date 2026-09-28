# Splice generated data blocks into the dev hippie.js between markers "// @@<NAME>" and "// @@END <NAME>".
# Usage: splice.py NAME file.js-fragment
import sys, re
H = '/Users/computer/rootline/apprentice-film/snapshots/f2r-harness/src/lib/hippie.js'
name, frag = sys.argv[1], open(sys.argv[2]).read().rstrip() + '\n'
s = open(H).read()
a, b = f'// @@{name}\n', f'// @@END {name}\n'
if a in s:
    i = s.index(a) + len(a); j = s.index(b)
    s = s[:i] + frag + s[j:]
else:
    raise SystemExit('marker not found: ' + name)
open(H, 'w').write(s)
print('spliced', name, len(frag))
