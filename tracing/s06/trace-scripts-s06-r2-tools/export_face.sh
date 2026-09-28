#!/bin/sh
# re-export the face data modules from the traced/calibrated JSON
cd /Users/computer/rootline/apprentice-film
python3 src/shots/s06/trace/tojs.py snapshots/s06-r2-src/face_strokes.json src/shots/s06/data/face.js FACE_INK "Face ink strokes of s06 (static part: brows, mouth and eye openings excluded), MEASURED on the source (mean
of frames 26.76-27.04, ungraded with trace/grade.py): centre-lines from trace/trace.py (Hessian ridge, hysteresis,
skeleton, re-joined, RDP); values then calibrated against renders (trace/calibrate.py). x, y, w, v, b per point.
Positions, widths and values only - no source pixels are stored."
python3 src/shots/s06/trace/masses2js.py snapshots/s06-r2-src/face_masses.json src/shots/s06/data/face_masses.js FACE_MASS "Tonal masses of the s06 face MEASURED on the source (trace/masses.py): outlines of the local ground (wash)
at a few levels, each filled with the measured ungraded value (calibrated with trace/calibrate.py). No pixels are stored."
