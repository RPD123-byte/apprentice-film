#!/bin/sh
# render spec pages: run.sh 0,1,2 outdir
cd "$(dirname "$0")" && rm -rf "$2" && npx --yes hyperframes@0.8.69 snapshot . --at "$(echo $1 | python3 -c "import sys;print(','.join(str(int(x)+0.5) for x in sys.stdin.read().strip().split(',')))")" --no-end --describe false -o "$2" 2>&1 | grep -i -E "error|fail" | head
