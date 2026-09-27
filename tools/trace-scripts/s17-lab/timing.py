# timing.py T1,T2,...: real per-frame draw time of s17 (headless chromium via playwright, no virtual time)
import sys, json, glob, os
from playwright.sync_api import sync_playwright
D='/Users/computer/rootline/apprentice-film/snapshots/s17-lab'
ts=[float(v) for v in sys.argv[1].split(',')]
open(f'{D}/tm-cfg.js','w').write('window.LAB='+json.dumps(dict(times=ts,crop=[0,0,2206,946],dbg=json.loads(sys.argv[2]) if len(sys.argv)>2 else {},grade=False))+';')
html=open(f'{D}/e3.html').read().replace('e3-cfg.js','tm-cfg.js')
open(f'{D}/tm.html','w').write(html)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files','--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(); pg.goto(f'file://{D}/tm.html')
    pg.wait_for_function('document.title.startsWith("ms")', timeout=300000)
    print(pg.title())
    b.close()
