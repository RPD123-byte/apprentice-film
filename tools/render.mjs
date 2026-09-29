#!/usr/bin/env node
// Render the film to MP4: draw every frame in order in one page (the same renderAt the composition uses), read the graded
// WebGL canvas back, and stream the raw frames into ffmpeg with the synthesized score. This is `npm run render`.
//
//   node tools/render.mjs [out.mp4]          default renders/film.mp4
//
// Why not `hyperframes render`: the film forces every 2D canvas onto the CPU for determinism (index.html), and
// HyperFrames' frame capture then slowed to ~1 fps and stalled for over 60 s on one frame near 100 s. Drawing in order in
// a single page is what the purity audit verifies (tools/harness/purity.mjs), and ffmpeg's bitexact flags keep the file
// itself reproducible: two renders of the same code on the same machine give the same bytes.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { openFilm, FPS, DUR, W, H, ROOT } from "./harness/film.mjs";

const out = path.resolve(process.argv[2] || path.join(ROOT, "renders/film.mp4"));
fs.mkdirSync(path.dirname(out), { recursive: true });
const score = path.join(ROOT, "audio/score.wav");
if (!fs.existsSync(score)) { console.error(`missing ${score} (npm run score)`); process.exit(1); }
const N = Math.round(DUR * FPS);

const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0",
  "-i", score,
  "-map", "0:v", "-map", "1:a",
  // readPixels returns rows bottom-up; convert with the BT.709 matrix the file is tagged with
  "-vf", "vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
  "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-profile:v", "high",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
  "-c:a", "aac", "-b:a", "192k",
  "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact", "-map_metadata", "-1",
  "-movflags", "+faststart",
  out,
], { stdio: ["pipe", "inherit", "inherit"] });
const ffDone = new Promise((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
const write = (buf) => new Promise((resolve, reject) => (ff.stdin.write(buf, (e) => (e ? reject(e) : resolve()))));

const { browser, page, loadSeconds } = await openFilm();
console.log(`loaded in ${loadSeconds.toFixed(1)} s; rendering ${N} frames to ${path.relative(ROOT, out)}`);
await page.evaluate(() => {
  const c = document.getElementById("film");
  const g = c.getContext("webgl") || c.getContext("webgl2");
  const px = new Uint8Array(c.width * c.height * 4);
  // draw frame t and return its pixels as base64 (FileReader encodes natively)
  window.__frameAt = (t) => {
    window.__film.renderAt(t);
    if (g.isContextLost()) throw new Error(`WebGL context lost at t=${t}`);
    g.readPixels(0, 0, c.width, c.height, g.RGBA, g.UNSIGNED_BYTE, px);
    return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.slice(r.result.indexOf(",") + 1)); r.readAsDataURL(new Blob([px])); });
  };
});
const t0 = Date.now();
try {
  for (let f = 0; f < N; f++) {
    const b64 = await page.evaluate((t) => window.__frameAt(t), f / FPS);
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== W * H * 4) throw new Error(`frame ${f}: got ${buf.length} bytes`);
    await write(buf);
    if (f % 250 === 0) process.stdout.write(`\rframe ${f}/${N}  ${((f + 1) / ((Date.now() - t0) / 1000)).toFixed(1)} fps   `);
  }
} finally {
  await browser.close();
  ff.stdin.end();
}
await ffDone;
console.log(`\rrendered ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.relative(ROOT, out)}`);
