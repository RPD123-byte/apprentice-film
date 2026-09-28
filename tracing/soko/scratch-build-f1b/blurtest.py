from playwright.sync_api import sync_playwright
js = """
(() => {
 const res = {};
 for (const wrf of [false, true]) {
  const c = document.createElement('canvas'); c.width = 40; c.height = 10;
  const g = c.getContext('2d', { willReadFrequently: wrf }); g.fillStyle = '#000'; g.fillRect(0,0,40,10); g.fillStyle = '#fff'; g.fillRect(20,0,1,10);
  const o = document.createElement('canvas'); o.width = 40; o.height = 10;
  const og = o.getContext('2d', { willReadFrequently: wrf }); og.filter = 'blur(' + window.__B + 'px)'; og.drawImage(c, 0, 0); og.filter = 'none';
  const d = og.getImageData(0, 5, 40, 1).data; const row = []; for (let x = 16; x < 25; x++) row.push(d[x*4]);
  res[wrf] = row.join(',');
 }
 return JSON.stringify(res);
})()
"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(); pg.set_content("<html></html>")
    for B in (0.4,0.55,0.65,0.8,1.0,1.5):
        pg.evaluate("window.__B=%s"%B); print(B, pg.evaluate(js))
    b.close()
