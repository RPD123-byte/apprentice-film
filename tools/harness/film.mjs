// Shared by the harness scripts: open the real composition (index.html -> src/main.js) in headless Chrome and wait
// until window.__film.renderAt is ready. Files are served from the repository by request interception (no server);
// anything else (GSAP from jsDelivr) goes to the network. No protocol timeout: loading every shot can take minutes.
//
// Chrome: $HYPERFRAMES_BROWSER_PATH (or $CHROME), else the newest chrome-headless-shell in hyperframes' cache
// (~/.cache/hyperframes/chrome/chrome-headless-shell) or puppeteer's cache (~/.cache/puppeteer/chrome-headless-shell).
// `npx --yes hyperframes@0.8.69 browser ensure` downloads one (scripts/setup.sh runs it).
// GPU: macOS uses ANGLE on Metal (as the renders did); elsewhere SwiftShader (software) unless HARNESS_GPU=hardware.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const W = 2206, H = 946, FPS = 25, DUR = 140.8;

const EXE_BY_PLATFORM = {
  "darwin/arm64": ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"],
  "darwin/x64": ["chrome-headless-shell-mac-x64", "chrome-headless-shell"],
  "linux/x64": ["chrome-headless-shell-linux64", "chrome-headless-shell"],
  "win32/x64": ["chrome-headless-shell-win64", "chrome-headless-shell.exe"],
};

function versionKey(dir) {
  // "mac_arm-152.0.7977.30" -> [152, 0, 7977, 30]
  return (dir.split("-").pop() || "").split(".").map((n) => parseInt(n, 10) || 0);
}

function newestIn(base) {
  const exe = EXE_BY_PLATFORM[`${process.platform}/${process.arch}`];
  if (!exe || !fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base).sort((a, b) => {
    const x = versionKey(a), y = versionKey(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0);
    return 0;
  });
  for (const d of dirs) {
    const p = path.join(base, d, ...exe);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function findChrome() {
  for (const v of ["HYPERFRAMES_BROWSER_PATH", "CHROME"]) {
    const p = process.env[v];
    if (p) {
      if (!fs.existsSync(p)) throw new Error(`${v}=${p} does not exist`);
      return p;
    }
  }
  const home = os.homedir();
  const p = newestIn(path.join(home, ".cache", "hyperframes", "chrome", "chrome-headless-shell")) ||
    newestIn(path.join(home, ".cache", "puppeteer", "chrome-headless-shell"));
  if (!p) {
    throw new Error("no chrome-headless-shell found. Run `npx --yes hyperframes@0.8.69 browser ensure` " +
      "(or set HYPERFRAMES_BROWSER_PATH to a Chrome / chrome-headless-shell binary).");
  }
  return p;
}

function gpuArgs() {
  if (process.env.HARNESS_GPU === "software") return ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  if (process.platform === "darwin") return ["--use-gl=angle", "--use-angle=metal", "--enable-gpu-rasterization"];
  if (process.env.HARNESS_GPU === "hardware") {
    return process.platform === "win32"
      ? ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu-rasterization"]
      : ["--use-gl=angle", "--use-angle=gl-egl", "--enable-gpu-rasterization"];
  }
  return ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".woff2": "font/woff2", ".ttf": "font/ttf", ".wav": "audio/wav", ".png": "image/png", ".css": "text/css" };

async function loadPuppeteer() {
  try {
    return (await import("puppeteer-core")).default;
  } catch (e) {
    throw new Error("puppeteer-core is missing: run `npm install` in the repository root first.");
  }
}

// Opens the film. Options:
//   page:        entry file relative to the repo (default "index.html")
//   beforeLoad:  async (page) => {} run before navigation (e.g. evaluateOnNewDocument hooks)
//   onFile:      (relPath) => {} called for every repository file the page requests
//   onMissing:   (relPath) => {} called for every requested repository path that does not exist (answered 404)
// Returns { browser, page, loadSeconds }.
export async function openFilm({ page: entry = "index.html", beforeLoad, onFile, onMissing } = {}) {
  const puppeteer = await loadPuppeteer();
  const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--enable-features=CanvasDrawElement",
    "--enable-webgl", "--ignore-gpu-blocklist", ...gpuArgs(),
    "--font-render-hinting=none", "--force-color-profile=srgb", `--window-size=${W},${H}`,
    "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--autoplay-policy=no-user-gesture-required", "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process"];
  const browser = await puppeteer.launch({ headless: true, executablePath: findChrome(), args, protocolTimeout: 0 });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") console.log("[page]", m.type(), m.text().slice(0, 300)); });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const u = new URL(req.url());
    if (u.hostname !== "film.local") return req.continue();
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      if (onMissing) onMissing(path.relative(ROOT, f));
      return req.respond({ status: 404, body: "" });
    }
    if (onFile) onFile(path.relative(ROOT, f));
    if (f.endsWith(".wav")) return req.respond({ status: 404, body: "" }); // the score is not needed for pictures
    req.respond({ status: 200, contentType: MIME[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
  });
  if (beforeLoad) await beforeLoad(page);
  const t0 = Date.now();
  await page.goto("http://film.local/" + entry, { waitUntil: "load", timeout: 0 });
  await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 0, polling: 500 });
  return { browser, page, loadSeconds: (Date.now() - t0) / 1000 };
}

// Parse "12.5,13,14.25" or a range "T0:T1" (every frame, 25 fps) into seconds.
export function parseTimes(arg) {
  if (!arg) throw new Error("no times given");
  if (arg.includes(":")) {
    const [a, b] = arg.split(":").map(Number);
    const out = [];
    for (let f = Math.round(a * FPS); f <= Math.round(b * FPS); f++) out.push(f / FPS);
    return out;
  }
  return arg.split(",").map(Number);
}
