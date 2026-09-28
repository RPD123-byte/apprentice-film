// probe harness (measurement only): node probe.mjs SCRIPT.js OUTPREFIX — imports SCRIPT (path under the project) in a
// headless page; its default export returns { name: dataURL | json }, saved as OUTPREFIX-name.png / .json
import { createRequire } from 'module';
const require = createRequire('/Users/computer/.npm/_npx/668c188756b835f3/node_modules/');
const puppeteer = require('puppeteer');
import fs from 'fs'; import path from 'path';
const ROOT = '/Users/computer/rootline/apprentice-film';
const SCRIPT = process.argv[2], OUT = process.argv[3];
const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', (req) => {
  const u = new URL(req.url());
  if (u.host !== 'film.test') return req.respond({ status: 404, body: '' });
  const p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (u.pathname === '/__p.html') return req.respond({ status: 200, contentType: 'text/html', body: `<!doctype html><body>
<script type=module>
  const m = await import(${JSON.stringify('/' + SCRIPT)});
  try { window.__r = await m.default(); } catch (e) { window.__r = { error: String(e.stack || e) }; }
</script>` });
  if (!fs.existsSync(p)) return req.respond({ status: 404, body: 'nf' });
  req.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(p) });
});
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => console.log('console:', m.text()));
await page.goto('http://film.test/__p.html');
await page.waitForFunction('window.__r', { timeout: 300000 });
const r = await page.evaluate('window.__r');
for (const [k, v] of Object.entries(r)) {
  if (typeof v === 'string' && v.startsWith('data:image')) fs.writeFileSync(`${OUT}-${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
  else fs.writeFileSync(`${OUT}-${k}.json`, JSON.stringify(v));
}
console.log('saved', Object.keys(r).join(','));
await browser.close();
