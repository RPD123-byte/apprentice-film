p = '/Users/computer/rootline/apprentice-film/fidelity/s18.md'
s = open(p).read()
lines = s.split('\n')
lines[0] = ("| s18 | 53.24–57.32 | Close on the synth. Shot A (53.24–55.24): the owl flies in over the speaker, lands on the keys "
            "and scurries left and back, wings beating. Shot B (55.28–57.28): extreme close-up of its talons stepping on the keys as "
            "they go down, the leap past the camera, and the synth tipping away. | close | Every frame is on the source's own frame "
            "and all three cuts land on the source's frames. Plates and owls are ink drawings measured from the source and redrawn "
            "by Canvas2D; no pixels are stored (method caveat below). Fix pass 4 (review 1) replaced the posterized shot-A feet with "
            "hand-drawn talons, redrew the beak, removed the belly/tail seam, drew the knob caps, fixed the key marks and softened "
            "the close-up owl. Its continuation (1b) redrew the shot-A tail as four separate feathers posed per frame, and "
            "lightened the take-off headphone cup. Feet and beak read better but score worse on blurred error; see Scores. Blurred "
            "σ6 error over all 102 frames: 3.01 (3.00 before fix pass 4, 3.03 after it). |")
s = '\n'.join(lines)

new_sec = """## Fix pass 1b: continuation of fix pass 4

The fix pass 4 agent was cut off after its last renders. Its work was on screen and complete, so this continuation took the most visible faults that were left. Numbers are from the same harness (`snapshots/s18-fix1-h`), against the exact source frame.

1. **Shot A tail (1331–1381): redrawn, clearly better.**
   - **The fault:** the phase drawings are medians of the standing frames, and the source's tail wags by up to ±11° and 9 px from frame to frame. So the traced tail was one smeared white blob with a grey rim, in every frame of shot A.
   - **The fix:** that tail is cut out of the three phase drawings. It is drawn per frame instead (`s18/tailA.js`), behind the body, as:
     - four long white feathers, the second the longest;
     - dark gaps between them that open out to the background;
     - a faint grey line splitting the long feather;
     - a shaded lowest feather.
   - **Where it comes from:** the geometry was read off frame 1356 from a per-pixel value table (edges at the half-value point). Each frame's pose (angle and shift about the root) was measured by ECC against 1356, masked to the tail.
     - 1334–1337 were fitted with the fly-in smear applied.
     - 1339–1340 used a grid search, then ECC.
     - 1331–1333 are too smeared to measure, so there the tail rides the body's fly-in affine.
   - **Score:** σ6 in the tail box over 1331–1381 went from 11.6 to 7.8. On the standing frames it went from about 9 to about 6.
2. **Take-off headphone cup (1421, 1422): lighter, but still not the source's drawing.**
   - **The fault:** the traced cup was a solid dark mass, about 55 pre-grade. The source has a mid-grey cushion, about 85, inside a thinner dark ring.
   - **The fix:** a measured value correction. Soft gaussian blobs of light and shade (σ 16–32), as `tone.js` uses, are applied to the flying-owl layer before its blur (`data/cupTone.js`).
     - They were fitted by `trace2/fit_tone_box.py`, with blob centres limited to the cup box.
     - The error was scored over everything the blobs reach, so no blob darkens the owl round the cup.
   - **Score:** σ6 in the cup box went from 10.4 to 6.2 (1421) and from 12.9 to 7.5 (1422). Over the whole frame it went from 4.41 to 4.15 and from 4.69 to 4.40.
   - **Still missing:** the cushion is a smooth lighter crescent. The double ring and the vertical striations are not drawn.
3. **Tried and reverted:**
   - **Fatter shot-A feet:** the rig's toes ×1.25–1.4 and legs ×1.35–1.5, with or without a thinner rim. The feet-box σ6 went from 13.3 to 14.1–15.1, because the feet are misplaced, not just thin. Reverted.
   - **Heavier inked outline on the shot-A owl (3.6 and 4.6 px):**
     - **The halo it targeted:** just outside the owl, the render is 12–20 levels brighter than the source, while the plate alone is darker than the source there. The halo comes from the bright traced edge lines on the head and the headband, spread by the grade's halation.
     - **Result:** the heavier outline cut that halo by only 1–2 levels and raised the error. Reverted.

"""
anchor = '## What fix pass 4 changed (review 1 defects)'
assert anchor in s
s = s.replace(anchor, new_sec + anchor)

a0 = s.index('Blurred σ6 mean absolute error, 0–255')
a1 = s.index('- **σ2:** 4.99 → 5.08.')
new_tab = """Blurred σ6 mean absolute error, 0–255, against the exact source frame. The harness renders frame n at t = (n+0.5)/25 through the shot module and the film's grade (`snapshots/s18-fix1-h`).

| range | before fix pass 4 | after fix pass 4 | after 1b (now) |
|---|---|---|---|
| A fly-in 1331–1337 | 3.13 / max 3.33 | 3.16 / 3.35 | 3.10 / 3.34 |
| A standing 1338–1381 | 2.92 / 3.36 | 3.02 / 3.47 | 2.99 / 3.48 |
| B standing 1382–1416 | 3.03 / 3.80 | 3.00 / 3.76 | 3.00 / 3.76 |
| B leap 1417–1419 | 3.21 / 4.02 | 3.17 / 3.95 | 3.17 / 3.95 |
| B take-off 1420–1423 | 4.15 / 4.52 | 4.19 / 4.69 | 4.05 / 4.40 |
| B wing and tip 1424–1432 | 2.56 / 3.11 | 2.54 / 3.12 | 2.54 / 3.12 |
| all 102 frames | **3.00 / 4.52** | **3.03 / 4.69** | **3.01 / 4.40** |

"""
s = s[:a0] + new_tab + s[a1:]

def rep(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)

rep('- **σ2:** 4.99 → 5.08.', '- **σ2:** 4.99 before fix pass 4, 5.08 after it, 5.05 now.')
rep('- **Official tool:** `tools/compare.sh` at 11 times that are multiples of 0.2 s (53.4 … 57.2) gives mean σ6 2.97 (2.36–3.77), in `snapshots/s18-fix1-cmp`.',
    '- **Official tool:** `tools/compare.sh` at 11 times that are multiples of 0.2 s (53.4 … 57.2) gives mean σ6 2.95 (2.36–3.77). It was 2.97 after fix pass 4. The pairs are in `snapshots/s18-fix1b-cmp`, the only comparison folder kept.')
rep('- **Motion:** `tools/sidebyside.sh 53.2 57.4 10` is in `snapshots/s18-fix1-motion`. The frame-accurate render|source mp4 of 1328–1436 is `snapshots/s18-fix1-motion/render_vs_source_25fps.mp4`.',
    "- **Motion:** the fix pass 4 motion sheets and mp4 were deleted with the other intermediate output. The reviewer's frame-accurate mp4 (`snapshots/s18-rev1-motion/render_vs_source_25fps.mp4`) shows the pre-pass state.")
rep('  - Under load 200, some take-off frames reached 300–340 ms.',
    '  - Under load 200, some take-off frames reached 300–340 ms.\n'
    '  - Pass 1b, at load average about 70: shot A standing 33–48 ms, shot A fly-in 69–205 ms, take-off 1417–1424 250–325 ms. The cup correction\'s gain field is cached, and the frames time the same with and without it. The tail adds under 5 ms.\n'
    '- **Determinism:** 14 frames rendered in reverse order in a separate browser (including 1331–1340, 1421 and 1422) are byte-identical to the forward render.')
rep('  - The headphone cup at 1421–1422 is crisp dark blotches instead of a blurred double ring.',
    '  - The headphone cup at 1421–1422 is now a lighter, smoother crescent (value corrected), but the double ring and the vertical striations are still not drawn.')
rep("""- **Shot A owl:**
  - The grey fills just inside the silhouette were not removed. Only a dark outline was added.
  - Grey smudges round the headphones remain.""",
    """- **Shot A owl:**
  - The grey fills just inside the silhouette were not removed. Only a dark outline was added.
  - Grey smudges round the headphones remain.
  - A faint halo glows 2–8 px outside the silhouette, 12–20 levels brighter than the source (bright traced edge lines plus the grade's halation). A heavier outline did not remove it.
  - The tail is now hand-drawn and posed per frame. On 1331–1333 it rides the fly-in affine, unmeasured. Its feathers are one fixed drawing, turned and shifted per frame, so their spread does not change as the source's does.""")
rep('''  - The feet are simpler and thinner than the source's talons, and the lifted "C" feet use one generic shape.''',
    '''  - The feet are simpler and thinner than the source's talons, and the lifted "C" feet use one generic shape. Fattening them scored worse (pass 1b), because their placement and structure are what differ. They need redrawing per frame.''')
rep('- **Data:** `s18/data/*.js`. New: `feetA.js`, the per-frame foot specs.',
    '- **Pass 1b:** `s18/tailA.js` (new), the shot-A tail and its per-frame poses. `s18/data/cupTone.js` (new), the take-off cup correction.\n- **Data:** `s18/data/*.js`. New: `feetA.js`, the per-frame foot specs.')
rep('- **Measurement scripts (never loaded):** `s18/trace2/`. New: `fit_bands.py`. The README is updated.',
    '- **Measurement scripts (never loaded):** `s18/trace2/`. New: `fit_bands.py`, and in pass 1b `fit_tone_box.py`. The README is updated.')
open(p, 'w').write(s)
print('ok')
