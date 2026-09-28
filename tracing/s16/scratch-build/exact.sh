#!/bin/sh
# usage: exact.sh TIMES outdir(absolute)
rsync -a --exclude main.js /Users/computer/rootline/apprentice-film/src/ /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/exact/src/
cd /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/exact && sh tools/compare.sh "$1" "$2"
