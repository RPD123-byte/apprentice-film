// same as render.mjs, frames in reverse order
import fs from "fs";
const src = fs.readFileSync(new URL("./render.mjs", import.meta.url), "utf8").replace("fs.mkdirSync(out, { recursive: true });", "frames.reverse(); fs.mkdirSync(out, { recursive: true });");
fs.writeFileSync(new URL("./render_rev_impl.mjs", import.meta.url), src);
await import("./render_rev_impl.mjs");
