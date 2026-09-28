s12 headless harness (fix pass 3): node run.mjs OUTDIR 34.0,35.2,35.3 [raw] renders s12 + post.js at those times
(bit-identical to compare.sh). met.py / crop.py / dtab.py / cushm.py / band.py compare OUTDIR/r-T.png against source
frames src-850.png / src-880.png / src-882.png, which must be extracted first (ffmpeg select=eq(n\,850) etc.) and are
not kept here; dtab.py also needs trace/degrade.py.
