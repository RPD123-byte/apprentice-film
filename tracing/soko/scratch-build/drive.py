#!/usr/bin/env python3
# drive.py "<query>" out.png [evalJS]  -- render tools/soko-test.html?<query> headless, save the #out canvas (full res)
import sys, os, base64, mimetypes, time
from playwright.sync_api import sync_playwright
ROOT='/Users/computer/rootline/apprentice-film'
q=sys.argv[1]; out=sys.argv[2]; ev=sys.argv[3] if len(sys.argv)>3 else None
def handle(route):
    url=route.request.url; path=url.split('://',1)[1].split('/',1)[1].split('?')[0]
    fp=os.path.join(ROOT,path)
    if os.path.isfile(fp):
        ct=mimetypes.guess_type(fp)[0] or 'application/octet-stream'
        if fp.endswith('.js'): ct='text/javascript'
        if fp.endswith('.woff2'): ct='font/woff2'
        route.fulfill(status=200, body=open(fp,'rb').read(), headers={'content-type':ct,'access-control-allow-origin':'*'})
    else:
        route.fulfill(status=404, body='nf')
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={'width':2206,'height':946})
    pg.route('http://soko.local/**', handle)
    pg.on('console', lambda m: print('console:', m.text) if m.type in ('error','warning','log') else None)
    pg.on('pageerror', lambda e: print('pageerror:', e))
    t0=time.time()
    pg.goto('http://soko.local/tools/soko-test.html?'+q)
    pg.wait_for_function('window.__done===true', timeout=240000)
    if ev: print(pg.evaluate(ev))
    data=pg.evaluate("document.getElementById('out').toDataURL('image/png')")
    open(out,'wb').write(base64.b64decode(data.split(',')[1]))
    print('rendered in %.1fs'%(time.time()-t0), 'timing', pg.evaluate('window.__timing||""'))
    b.close()
