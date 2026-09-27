import puppeteer from "/Users/computer/.npm/_npx/668c188756b835f3/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js";
const html = `<!doctype html><html><body><canvas id=c width=2206 height=946></canvas><script>
const g = document.getElementById("c").getContext("2d");
function bars(mode){ const t0=performance.now();
  for (let r=0;r<3;r++){ g.fillStyle="#000"; g.fillRect(0,0,2206,946); g.save(); g.globalCompositeOperation="lighten";
  for (let i=0;i<300;i++){ const x0=(i*37)%2206-300, y0=(i*53)%946, L=600, dx=L*0.846, dy=L*0.533, w=6, nx=-dy/L*w/2, ny=dx/L*w/2;
    if (mode===0) g.fillStyle="rgb(180,180,180)"; else { const gr=g.createLinearGradient(x0,y0,x0+dx,y0+dy); gr.addColorStop(0.1,"rgb(100,100,100)"); gr.addColorStop(0.5,"rgb(200,200,200)"); gr.addColorStop(0.9,"rgb(150,150,150)"); g.fillStyle=gr; }
    if (mode===2) g.globalCompositeOperation="source-over";
    g.beginPath(); g.moveTo(x0+nx,y0+ny); g.lineTo(x0+dx+nx,y0+dy+ny); g.lineTo(x0+dx-nx,y0+dy-ny); g.lineTo(x0-nx,y0-ny); g.closePath(); g.fill(); }
  g.restore(); g.getImageData(0,0,1,1); }
  return (performance.now()-t0)/3; }
window.res=[bars(0),bars(1),bars(2),bars(0),bars(1),bars(2)];
</script></body></html>`;
const browser = await puppeteer.launch({ headless: "shell" });
const page = await browser.newPage();
await page.setContent(html);
console.log(await page.evaluate(() => window.res.map((v) => v.toFixed(1))));
await browser.close();
