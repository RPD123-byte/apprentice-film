import subprocess,glob,os,sys
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__))
CH=glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1228/*/chrome-headless-shell'))[0]
subprocess.run(['/Users/computer/node_modules/.bin/esbuild',f'{D}/entry_t.js','--bundle','--format=esm','--target=es2022',f'--outfile={D}/bundle_t.js','--log-level=error'])
open(f'{D}/ht.html','w').write(open(f'{D}/h.html').read().replace('bundle.js','bundle_t.js'))
pw=sync_playwright().start(); b=pw.chromium.launch(executable_path=CH,args=['--allow-file-access-from-files','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
p=b.new_page(viewport={'width':2206,'height':946}); p.goto(f'file://{D}/ht.html'); p.wait_for_function('() => window.S15ready === true')
fs=[int(x) for x in sys.argv[1].split(',')]
p.evaluate('(t)=>window.S15.time(t)',fs[0]/25)
tot=0
for f in fs:
    ms=p.evaluate('(t)=>window.S15.time(t)',f/25); tot+=ms; print(f, round(ms),'ms')
print('mean',round(tot/len(fs)))
b.close(); pw.stop()
