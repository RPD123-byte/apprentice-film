#!/bin/sh
# lab.js = src/shots/s16.js without the s17 import (fast harness page loads), with absolute import paths;
# VIEW=roomonly (harness) leaves out the owl and the steam (for the room's light matching)
cd /Users/computer/rootline/apprentice-film
sed -e 's#try { NEXT = (await import("./s17.js")).shot || null; } catch (e) { NEXT = null; }#// (lab: no s17)#' \
    -e 's#from "\./#from "/src/shots/#g' -e 's#import("\./#import("/src/shots/#g' -e 's#from "\.\./config.js"#from "/src/config.js"#' \
    -e 's#^try { OWL = #if ((globalThis.__S16 || {}).view !== "roomonly") try { OWL = #' \
    -e 's#^try { STEAM = #if ((globalThis.__S16 || {}).view !== "roomonly") try { STEAM = #' \
    src/shots/s16.js > snapshots/s16-fix1-tools/lab.js
