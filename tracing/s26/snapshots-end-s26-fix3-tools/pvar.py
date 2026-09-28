# pvar.py TAG PAGEMODULE: a harness variant of s26.js whose colour page is the traced page module (scratch)
import sys, subprocess
tag, mod = sys.argv[1], sys.argv[2]
subprocess.run(['python3', 'mkvar.py', tag], check=True, capture_output=True)
p = f'var/s26_{tag}.js'; s = open(p).read()
old = 'if (!c.page) { const p = hippiePageCanvas(); c.page = mk(p.width, p.height); c.page.getContext("2d").drawImage(p, 0, 0); tone("F").canvas(c.page); }'
assert old in s
s = s.replace(old, 'if (!c.page) { c.page = mk(W, H); const g = c.page.getContext("2d"); g.fillStyle = "#1c1b24"; g.fillRect(0, 0, W, H); paintTrace(g, PAGE_T, { col: tone("F") }); }')
s = s.replace('import { PAGEA } from', f'import {{ PAGE_T }} from "{mod}";\nimport {{ PAGEA }} from')
open(p, 'w').write(s); print(p)
