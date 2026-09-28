// s06 fix1 render harness (measurement only): headless Chrome, project files served by request interception (no
// server), the real main.js pipeline (shot draw + post.js grade) at exact 25 fps frames. Writes OUT/f-<frame>.png.
// Usage: node render.mjs OUTDIR 668,670,700 | 668-725
import { createRequire } from 'module';
const require = createRequire('/Users/computer/.npm/_npx/668c188756b835f3/node_modules/');
const puppeteer = require('puppeteer');
import fs from 'fs'; import path from 'path';
const ROOT = '/Users/computer/rootline/apprentice-film';
const OUT = process.argv[2];
let frames = [];
for (const part of (process.argv[3] || '670').split(',')) {
  if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= b; i++) frames.push(i); }
  else frames.push(Number(part));
}
const xi = process.argv.indexOf('--x'); const X = xi > 0 ? process.argv[xi + 1] : '{}';   // experiment overrides (globalThis.__S06X; the shipped s06 reads none)
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on('request', (req) => {
  const u = new URL(req.url());
  if (u.host !== 'film.test') return req.respond({ status: 404, body: '' });
  const p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (u.pathname === '/__h.html') return req.respond({ status: 200, contentType: 'text/html', body: `<!doctype html>
<body style="margin:0;background:#000"><canvas id=film width=2206 height=946></canvas>
<script>window.gsap={timeline(){return {fromTo(){return this}}}}; globalThis.__S06X=${X};</script>
<script type=module>
  await import('/src/main.js');
  window.__ready = true;
</script>` });
  if (!fs.existsSync(p)) { console.log('404', u.pathname); return req.respond({ status: 404, body: 'nf' }); }
  req.respond({ status: 200, contentType: p.endsWith('.js') || p.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream', body: fs.readFileSync(p) });
});
page.on('console', (m) => { const t = m.text(); if (!t.includes('404')) console.log('console:', t); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://film.test/__h.html');
await page.waitForFunction('window.__ready', { timeout: 300000 });
const tms = [];
for (const n of frames) {
  const t = n / 25;
  const [url, ms] = await page.evaluate((t) => {
    const a = performance.now();
    window.__film.renderAt(t);
    const c = document.getElementById('film');
    const d = c.toDataURL('image/png');
    return [d, performance.now() - a];
  }, t);
  tms.push(Math.round(ms));
  fs.writeFileSync(path.join(OUT, `f-${n}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
console.log('frames', frames.length, 'ms(render+encode)', JSON.stringify(tms));
await browser.close();
