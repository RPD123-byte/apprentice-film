import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const browser = await puppeteer.launch({ executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", headless: true, args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-gpu-sandbox", "--disable-features=CanvasNoise"], protocolTimeout: 1200000 });
const page = await browser.newPage(); page.on("pageerror", (e) => console.log("[pageerror]", String(e)));
await page.goto("file://" + process.cwd() + "/timing.html", { timeout: 0, waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.title === "READY" || document.title === "FAIL", { timeout: 0 });
const fr = []; for (let n = 1331; n <= 1432; n++) fr.push(n);
const r = await page.evaluate((fr) => tm(fr), fr);
console.log(r.map(([n, v]) => `${n}:${v}`).join(" "));
await browser.close();
