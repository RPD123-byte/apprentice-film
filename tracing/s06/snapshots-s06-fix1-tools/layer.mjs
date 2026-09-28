// draw single r3 layers (ungraded) on a mid-grey canvas, to see which layer draws what. Usage:
// node layer.mjs OUT.png r3_face_s,r3_brow_s [bg]
import { createRequire } from 'module';
const require = createRequire('/Users/computer/.npm/_npx/668c188756b835f3/node_modules/');
const puppeteer = require('puppeteer');
import fs from 'fs'; import path from 'path';
const ROOT = '/Users/computer/rootline/apprentice-film';
const OUT = process.argv[2], names = process.argv[3].split(','), bg = process.argv[4] || '#808080';
const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', (req) => {
  const u = new URL(req.url());
  if (u.host !== 'film.test') return req.respond({ status: 404, body: '' });
  const p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (u.pathname === '/__l.html') return req.respond({ status: 200, contentType: 'text/html', body: `<!doctype html><canvas id=c width=2206 height=946></canvas>
<script type=module>
  const { drawR3 } = await import('/src/shots/s06/face3.js');
  const c = document.getElementById('c'), g = c.getContext('2d');
  g.fillStyle = ${JSON.stringify(bg)}; g.fillRect(0, 0, 2206, 946);
  g.translate(0.5, 0.5);
  for (const n of ${JSON.stringify(names)}) { const { L } = await import('/src/shots/s06/data/' + n + '.js'); drawR3(g, L); }
  window.__d = c.toDataURL('image/png');
</script>` });
  if (!fs.existsSync(p)) return req.respond({ status: 404, body: 'nf' });
  req.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(p) });
});
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://film.test/__l.html');
await page.waitForFunction('window.__d', { timeout: 300000 });
const d = await page.evaluate('window.__d');
fs.writeFileSync(OUT, Buffer.from(d.split(',')[1], 'base64'));
await browser.close();
