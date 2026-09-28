end-s27-tfix (2026-09-27): targeted fix round on s27. Measuring / tracing scripts, not part of the film; everything they write
into src/ is numbers and polygons (no pixels). Work dir (deleted after the round): snapshots/end-s27-tfix-work with
src/sN.png (source frame N at 25 fps, extract.py), film/fN.png (renders/film.mp4), before/rN.png (live tree at the start),
mask/v0_rN.png (room-mask renders: render_dbg.mjs mask F.. raw '[{"room":"mask"}]' with SHOTS=s27).

Render / compare
  render.mjs OUT F1,F2..  (harness.html: s26/s27/s28 through post.js, frame exact)   render_dbg.mjs (with __s27dbg variants)
  m2.py (dE8/s4/s12 + ink energy, sharpness, grain per stretch), grain.py (flat-area grain bands), cmp3.py / grid2.py (crops),
  regoff.py / chamoff.py / baseicp.py (registration of lid, base, designer, notebook in the turn: all within 0-2 px, no refit)

End-orbit room (127.88-129.28) -> src/shots/s27/okeys/*.js, src/shots/s27/orbitMesh.js
  flowmesh.py  room motion between two source frames: DIS flow chained frame to frame on the room only (our room-mask
               render, eroded), forward-backward checked, least-squares bilinear mesh (32 px nodes, membrane + bending)
  plate.py     grain-free plate at a key frame: +-2 frames brought on by the mesh + a small dense refinement, median, NLM 4
  keymask2.py  object mask = our layers as drawn, grown by GrabCut (8 px) onto the source's objects
  room_vec.py  the s27 room tracer (copied from tools/trace-scripts/s27-k-tools) with new options: --sato lo,hi (ridge-filter
               ink with hysteresis, continuous thin window/shelf lines), --core, --inkpx N (ink tones per pixel, smoothed
               along the line, so faint lines stay faint), --inkgrow, --inpd, --premed, --prebil
  keys.sh "3197 3200 ... 3232"   plate -> mask -> trace, one key every 3 frames (13 keys)
  meshes.py OUT.js K1,K2,..      per-frame meshes (every frame between two keys, to both keys) -> orbitMesh.js
  fitcol.py RENDERDIR F..        fitted region colours: source vs render low-frequency difference (un-graded, room only),
                                 each region moved by its own mean (+-14); run twice (renders after each export)
  export.py F1,F2,..             codec-encode the traces into src/shots/s27/okeys/ + index.js
  Order used: keys.sh; export.py; render; fitcol.py a1 ...; export.py; render a2; fitcol.py a2 ...; export.py.
old/  copies of the files as they were before this round (keys/index.js and the six replaced end-orbit keys k_127_88 ...
      k_129_12, s27.js, props.js, laptop.js, gl.js).
