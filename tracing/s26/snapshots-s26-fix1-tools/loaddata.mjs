// dump s26 data modules as JSON (node). Usage: node loaddata.mjs module exportName
const [mod, name] = process.argv.slice(2);
const m = await import(mod);
process.stdout.write(JSON.stringify(m[name]));
