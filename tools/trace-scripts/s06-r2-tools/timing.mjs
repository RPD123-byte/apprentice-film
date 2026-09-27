// timing harness (measurement only): headless Chrome, files served by request interception (no server), times shot.draw
import { createRequire } from 'module';
const require = createRequire('/Users/computer/.npm/_npx/668c188756b835f3/node_modules/');
const puppeteer = require('puppeteer');
import fs from 'fs'; import path from 'path';
const ROOT = '/Users/computer/rootline/apprentice-film';
const times = (process.argv[2] || '26.8,26.84,27.2,27.6,28.0,28.2,28.24,28.3,28.44,28.8').split(',').map(Number);
const shotFile = process.argv[3] || 'src/shots/s06.js';
const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', (req) => {
  const u = new URL(req.url());
  if (u.host !== 'film.test') return req.continue();
  const p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (u.pathname === '/__t.html') return req.respond({ status: 200, contentType: 'text/html', body: `<!doctype html><canvas id=c width=2206 height=946></canvas><script type=module>
    const { shot } = await import('/${shotFile}');
    const ctx = document.getElementById('c').getContext('2d');
    const T = ${JSON.stringify(times)}, out = [];
    for (const t of T) { const a = performance.now(); ctx.fillStyle='#000'; ctx.fillRect(0,0,2206,946); shot.draw(ctx, t - 26.72, t); ctx.getImageData(0,0,1,1); out.push([t, Math.round(performance.now() - a)]); }
    window.__done = out;
  </script>` });
  if (!fs.existsSync(p)) return req.respond({ status: 404, body: 'nf' });
  req.respond({ status: 200, contentType: p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream', body: fs.readFileSync(p) });
});
page.on('console', (m) => console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://film.test/__t.html');
await page.waitForFunction('window.__done', { timeout: 300000 });
console.log(JSON.stringify(await page.evaluate('window.__done')));
await browser.close();
