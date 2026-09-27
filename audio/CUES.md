# Soundtrack cue list (140.8 s)

Every sound in `audio/score.wav` is synthesized by `tools/sound/score.py` from the cue table in `tools/sound/cues.py` (regenerate: `python3 tools/sound/score.py`). Times, pitches and levels were measured on the source film's audio track (analysis only -- no source audio is used). Generated from the cue table; do not edit by hand.

- **level** = 20 ms peak of the event alone, dBFS (mid), after the per-event mix trim in `lvl_cal.json`; drones/whines are rms; `L0.5` / `R0.5` = pan.
- **Whole-film shape**: 0-110 s black-and-white horror section -- no score, only room tone, dark tonal drones and close foley; 92.66-97.57 an electric storm; 103-110.5 a stomping 3+3+2 pulse at 120 BPM over a G drone. 110.6-111.6 two blow-out hits into colour; music from 114.87: felt piano + warm pad + bass + a high string shimmer, F major / D minor, ~71 BPM (chords every ~0.84 s), the 128.65-136.0 stretch sits ~30 cents sharp; 136.1 a C major 7 end chord that fades to silence at 140.62.
- **Room tone** is a 10-band noise bed whose band levels follow keyframes measured on the source (see BED in cues.py); dropouts at the hard cuts are reproduced.


## s01  0.00-6.04 s  Bird's-eye push-in over the desk

Close room tone: low fan rumble with an Eb/Bb sub hum (39 + 58 Hz). Trackpad clicks as the pages swipe; one hard click at 4.18.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|   0.000 | drone | -47 | D#1-A#1-C2-D3 drone to 6.02 (-33 c) |
|   0.020 | thud | -24 | the film opens on a soft low knock |
|   0.693 | click | -34 | trackpad clicks / swipes as the pages change (21 ticks) |
|   4.176 | click | -17 | one hard, close click (the loudest tick of the shot) |
|   6.020 | dropout | | the sound drops out for 50 ms at the cut |

## s02  6.04-19.12 s  The stare; pan into the boxes; the owl takes off

Dropout, then a dull sub THUD on the cut; his breath at 8.8; a dark G-Ab-B cluster drone; a rising glassy cluster as the camera pans off his face (11.8-14.5); the owl's tweet, a low swell and a snap; claws on cardboard; wingbeats every ~0.35 s.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|   6.070 | drone | -44 | D#1-F#1-A#1-B1-G#2 drone to 9.00 (-20 c) |
|   6.075 | boom | -14 | hard cut: dull sub THUD, long low tail (the bed swells then settles) |
|   8.745 | breath | -28 | one breath (air through the nose), 8.75-8.95 |
|   9.000 | drone | -46 | A#1-D#1-G3-A3-F3-B3-G#3 drone to 12.20 (-20 c) |
|  11.500 | riser_cluster | -50 | the pan: a rising glassy cluster of partials over an air rush, cut dead at 14.5 |
|  12.000 | drone | -48 | D#1-A#1-G2-B2-A#2-D#2 drone to 14.50 (-15 c) |
|  14.510 | drone | -49 | D#1-A2-G2-G#2-G3-A3-A#2 drone to 19.50 |
|  15.250 | rumble | -8 | a low swell as it rises (15.3-16.0) |
|  15.275 | chirp | -40 | the owl's tweet (2.7 kHz, rise-fall) |
|  15.290 | whine | -40 | thin steady 2790 Hz tone to 15.92 |
|  15.920 | click | -28 | a hard snap (wings open) |
|  16.165 | scratch | -26 | claws scrape on cardboard |
|  16.645 | wingflap | -19 | wingbeats every ~0.35 s, fading as it flies to him (9 beats) |

## s04  19.12-23.12 s  Owl on his shoulder; camera arcs behind him

Two soft landing taps; quiet F-major-ish drone; a long low air rumble with the arc.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  19.300 | drone | -50 | A#1-C3-F3-A3-B3-D#1 drone to 23.12 (-25 c) |
|  19.755 | tap | -35 | landing: two soft taps on his shoulder |
|  20.000 | whine | -60 | thin steady 2800 Hz tone to 21.50 |
|  21.450 | rumble | -29 | the camera arcs behind him: long low air rumble (peak 22.4) |

## s05  23.12-26.72 s  Over the shoulder: typing, site switch

Trackpad double-click; a soft UI chime; a bloop; the audio cuts early (26.14) to the next room with a thud.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  23.130 | drone | -50 | D#1-A#1-G2-G#2-C#3-D#3-G3 drone to 26.12 |
|  23.733 | click | -27 | trackpad double-click |
|  24.000 | bloop | -40 | a soft UI chime as the site changes (1.05/1.6/2.1 kHz, 24.0-24.8) |
|  25.387 | ping | -23 | a bloop (1.1 kHz -> 950 Hz) + 2.8 kHz |
|  25.400 | whine | -52 | thin steady 2800 Hz tone to 26.12 |
|  26.139 | thud | -17 | audio cuts early to the tired shot: a low knock + closer room |
|  26.140 | drone | -47 | D#1-A#1-G2-G#2-D#3-A3 drone to 29.10 (+20 c) |
|  26.140 | whine | -50 | thin steady 2780 Hz tone to 27.30 |

## s06  26.72-29.04 s  Tired, head on hand

Closer, warmer room tone; one low knock (26.76).


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  26.763 | thud | -26 | a low knock (26.76) |

## s07  29.04-30.56 s  Over the shoulder on Pure Imagination

Keyboard clatter starts (29.12).


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  29.100 | drone | -52 | D#1-A#1-A3-D#3-C3-A#2 drone to 33.62 (+20 c) |
|  29.120 | key | -34 | keyboard clatter, continuous from 29.12 to 33.49 (54 keystrokes) |

## s08  30.56-32.60 s  Screen close-up: the note card types

Typing continues without a break.


## s09  32.60-33.60 s  Owl close-up

Typing continues to 33.5.


## s12  33.60-35.36 s  The room drops away: owl on black

A hard hit + sub tail as the room vanishes, then a low empty hum.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  33.632 | boom | -17 | the room drops away: a hard hit + sub tail |
|  33.640 | drone | -46 | D#1-A#1-G2-F2 drone to 36.90 (+20 c) |
|  35.300 | voice | -16 | the owl's startled squawk (500 -> 606 -> 550 Hz) |

## s13  35.36-36.92 s  Owl startled

A squawk gliding 500-606-550 Hz with a feather ruffle; a short low hoot; a small chirp.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  36.080 | voice | -22 | a short low hoot |
|  36.500 | voice | -30 | a small chirp |
|  36.900 | drone | -51 | D#1-A#1-C2-F2-A2-B2 drone to 40.00 (+20 c) |

## s14  36.92-40.72 s  Small owl in the dark heads for the light

An air swish; a thin 1.95 kHz ring; tiny running feet; a low swell as the corridor appears; a chirp.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  37.100 | whoosh | -27 | an air swish (37.15) |
|  37.300 | whine | -46 | thin steady 1950 Hz tone to 38.55 |
|  37.300 | whine | -58 | thin steady 3900 Hz tone to 38.55 |
|  38.560 | tap | -30 | tiny running feet (38.56-39.73) |
|  39.850 | rumble | -19 | a low swell as the corridor appears (peak 40.05) |
|  40.000 | drone | -50 | D#1-A#1-C2-D2-G2-B2-C3-G#3 drone to 45.72 (+20 c) |
|  40.600 | voice | -22 | a chirp (344 -> 310 Hz) |

## s15  40.72-45.72 s  Corridor run through boxes and gear

Continuous tiny footsteps, little chirps, air whooshes as boxes rush past.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  40.763 | tap | -53 | tiny running footsteps down the corridor |
|  41.620 | whoosh | -33 | low whooshes as boxes and gear rush past (41.7, 42.55, 42.9, 43.5, 44.0, 44.45, 45.1) |
|  41.660 | chirp | -23 | little chirps as it runs |

## s16  45.72-47.84 s  Flies into his face; tumbles by the mug; white flash

A soft thump + squawk; two tumble thumps; dropout; a ting and a whip-crack whoosh into the flash.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  45.720 | drone | -52 | D#1-A#1-C2-G2 drone to 47.49 (+20 c) |
|  45.755 | thud | -11 | it flies into his face: a soft muffled THUMP |
|  45.780 | voice | -9 | + a squawk |
|  46.400 | thud | -21 | tumbling by the mug: two thumps |
|  47.500 | dropout | | the sound drops out for 20 ms at the cut |
|  47.508 | ping | -37 | dropout (47.50), then a tiny ting |
|  47.745 | whoosh | -11 | a whip-crack into the white flash (47.76), then a long low air tail |
|  47.800 | drone | -48 | E1-D1-B1-A2 drone to 50.00 |

## s17  47.84-53.24 s  Full-frame site: MIXING DOWN

The flash's air tail decays; an A drone; tiny patter of the owl inside the illustration.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  50.000 | drone | -50 | A1-E2-C#2-G3-A3 drone to 53.24 |
|  50.267 | tap | -48 | the owl's tiny patter inside the illustration |

## s18  53.24-57.32 s  Close on the synth; feet on the keys

Each step strikes a cluster of keys (piano/synth clusters on the owl's steps), then the fall: a smashed low chord + clatter.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  53.627 | cluster | -12 | each step on the keys sounds a cluster (10 strikes, 53.63-56.41) |
|  56.690 | whoosh | -25 | it slips: air, then the keyboard comes down |
|  56.885 | cluster | -12 | a sour smashed low chord + heavy clatter (56.89) |
|  57.243 | thud | -26 R0.1 | the owl tumbles: a run of soft thumps (left of centre) |

## s19  57.32-63.12 s  The note card; the owl tumbles, dusts off, lifts it

Tumble thumps (left), a soft ding, dust puff, a rising ding, a thump and a rising coo.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  57.400 | drone | -56 | C2-F2-A#2-C#3-D3-G#3 drone to 63.10 (+30 c) |
|  59.163 | ping | -28 | a soft ding (2.8 kHz): the smiley on the card |
|  59.340 | whine | -45 | thin steady 2800 Hz tone to 59.40 |
|  59.400 | dust | -26 | a dusty puff as it shakes itself (59.4-60.0) |
|  60.075 | ping | -17 | a rising ding (2.5 -> 2.8 kHz): 'This is really good' |
|  61.355 | thud | -16 | it hops: a soft thump |
|  61.680 | chirp | -15 | a rising coo (400 -> 614 Hz) |
|  62.315 | tap | -36 | papery taps as it lifts the card (left) |
|  63.100 | drone | -58 | C2-F2-A#2-G#3-D3 drone to 67.30 (+30 c) |

## s20  63.12-69.44 s  Wide: scissors; the smirk

A thump (left), a flurry of wing/dust whumphs, silence, the scissors grabbed, then a metallic SHING ringing at 2.75 kHz.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  63.472 | thud | -14 L0.3 | a thump (left) |
|  64.427 | wingflap | -37 | a flurry of wing/dust whumphs round the scissors (64.4-65.5) |
|  67.300 | drone | -52 | B1-G#2-F2-D3 drone to 69.50 |
|  67.301 | click | -44 | the scissors are grabbed |
|  67.857 | shing | -19 | metallic SHING: a bright scrape, then the blade rings quietly at 2.75 kHz to ~70.3 (the smirk) |

## s21  69.44-74.52 s  The page: the owl walks in and flies up

Tiny marching feet, effortful wingbeats, a landing, first snips.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  69.500 | drone | -58 | C2-D#2-C#3 drone to 74.50 |
|  69.675 | thud | -46 | tiny marching feet onto the page (soft low pats) |
|  70.920 | whine | -56 | thin steady 1800 Hz tone to 71.95 |
|  71.968 | wingflap | -50 | effortful wingbeats up the page |
|  72.981 | thud | -20 | a small landing |
|  73.525 | snip | -42 | the first test snips |
|  74.500 | drone | -51 | C2-G2-A#2-G3-D2 drone to 81.00 |
|  74.510 | dropout | | the sound drops out for 15 ms at the cut |

## s22  74.52-84.04 s  It cuts round the header

Steady snipping (the ring of blades), side-to-side thumps (left, then right), a pop as the strip comes loose, little owl calls, a long papery crackle as it peels.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  74.528 | snip | -33 | steady snipping round the header; the pitch drops a step on each new side |
|  74.550 | whine | -66 | thin steady 10000 Hz tone to 77.80 |
|  76.533 | thud | -17 L0.8 | a thump on the left side |
|  79.195 | snip | -32 R0.5 | then on the right |
|  79.845 | pop | -14 | a papery POP: the strip comes loose (79.86) |
|  80.030 | voice | -30 | little owl calls (80.1, 80.3) |
|  80.900 | drone | -54 | C2-C3-G3-D2-F2-A#2 drone to 84.00 (+30 c) |
|  81.531 | tear | -47 | a long sticker-peel crackle as the strip is peeled (81.5-84.0) |
|  84.000 | drone | -54 | C2-A#1-E1-A#2 drone to 88.40 |
|  84.030 | flump | -16 L0.1 | a heavy papery flump as it comes free (84.05-84.2) |

## s23  84.04-97.08 s  Carries the strip; slaps on the colour banner; glows

A heavy papery flump; high peeps; wobbling steps and calls; a fat THWUMP + shimmer; a long voiced sigh; a hole in the sound; a rising whine, then IGNITE: sub drop + electric crackle + a storm of snips and whooshes.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  84.672 | tap | -39 | wobbling footsteps under the weight |
|  84.740 | chirp | -35 | high peeps (925 Hz) as it staggers under the weight |
|  85.570 | dropout | | the sound drops out for 20 ms at the cut |
|  85.819 | thud | -26 L0.2 | a stumble (85.82-85.96) |
|  86.600 | whoosh | -40 L0.9 | a swing to the left with the strip |
|  86.610 | voice | -25 | effort calls (86.6, 86.9, 87.2) |
|  88.350 | flump | -28 | a fat paper THWUMP as the banner is slapped on (88.39-88.47) |
|  88.400 | drone | -54 | A#2-E2-G2-C2-A#1 drone to 91.00 (-20 c) |
|  88.520 | shimmer | -42 | a shimmer (2.7 kHz) as the seam sticks, 88.5-89.2 |
|  89.717 | thud | -28 | pats (89.72, 90.09) |
|  90.680 | voice | -23 | a long relieved sigh, voiced, falling 409 -> 229 Hz |
|  91.000 | drone | -60 | A#1 drone to 92.55 |
|  91.947 | click | -29 | a hole in the sound; one click |
|  92.100 | riser | -40 | a rising electric whine (92.1-92.65) |
|  92.640 | boom | -26 | IGNITE: bass drop + crackle; the loud section starts |
|  92.660 | electric | -20 | a buzzing electric bed with warbling high partials (92.66-97.57) |
|  93.872 | whoosh | -25 L0.3 | a storm of snips and whooshes, everywhere at once |
|  95.419 | thud | -20 L0.2 | heavy hits (95.42, 95.57) |

## s24  97.08-100.48 s  Flurry of cuts, white flash, speed lines

Dropout (freeze), a flurry of snips, a whoosh-boom into the flash, air whooshes (right).


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
|  97.580 | dropout | | the sound drops out for 20 ms at the cut |
|  97.611 | snip | -33 | FREEZE: dropout at 97.58, then a flurry of snips |
|  98.840 | whoosh | -28 | a whoosh-boom into the white flash (98.93) |
|  99.180 | whoosh | -17 | air whooshes on the speed lines (99.3, 100.35 right) |

## s25  100.48-110.52 s  The page in shards; hands on hips

Glassy shard whooshes with little falling chirps; a big impact and a rising whoop; then a G drone with a stomping 3+3+2 low pulse (~120 BPM).


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
| 100.533 | shard | -36 | glassy shard tinkles and little falling chirps |
| 101.611 | shardfall | -24 L0.9 | shards whoosh past (101.6 left, 102.1, 102.8) |
| 103.125 | boom | -7 | a big impact as the owl lands in the middle |
| 103.180 | whoop | -26 | a rising whoop (G3 -> A#3 -> D#4), 103.2-104.0 |
| 103.200 | drone | -44 | G2-G3-G4-D5-C5-D2-C2 drone to 110.55 (+30 c) |
| 103.573 | kick | -29 | hands on hips: a stomping 3+3+2 low pulse (~120 BPM) under a G drone |
| 104.565 | snap | -45 | finger-snap / tick accents |

## s26  110.52-117.52 s  The shards blow out into colour

Two big blow-out hits with long noisy tails, whooshes; the music enters at 114.87 (D minor 9, F major...).


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
| 110.597 | blowout | -11 | the shards blow out: big hit + noisy tail (110.60) |
| 110.700 | drone | -54 | A3-G2-A2-F1 drone to 111.58 |
| 111.600 | blowout | -13 | second blow-out hit into colour (111.62), long roaring tail |
| 112.640 | whoosh | -17 | whoosh-hits (112.75, 113.95 left) |
| 114.870 | music | | chord: bass D2, piano D3 F3 A3 C4 D4 E5, pad D3 F3 A3 C4 E4 |
| 115.640 | music | | chord: bass F2, piano F3 A3 C4 G4, pad F3 A3 C4 G4 A5 |
| 116.140 | music | | chord: bass G2, piano G3 A#3 D#4 G4 C5, pad D#3 G3 A#3 C5 |
| 117.030 | music | | chord: bass A#2, piano G3 C4 G4 C5, pad G3 C4 D4 G4 C5 |

## s27  117.52-129.30 s  Morning room; pan to him asleep; owl on the laptop

Soft piano + warm pad in F major / D minor at ~71 BPM, faint birds, a low swell, the owl's steps on the keys.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
| 118.150 | birds | -58 | faint birds outside (118.2-119.3, 120.0-120.4) |
| 119.020 | music | | chord: bass A#2, piano C4 F4 G4 A4, pad C4 F4 A4 |
| 120.050 | rumble | -35 | a low swell with the pull-back (120.1-121.1) |
| 121.130 | music | | chord: bass D2, piano D3 F3 A3 C4, pad D3 F3 A3 C4 |
| 121.980 | music | | chord: bass F2, piano C3 G3 A3 C4 G4 C5, pad F3 A3 C4 G4 |
| 122.830 | music | | chord: bass A#2, piano G3 D4 F4, pad F3 G3 D4 F4 |
| 123.800 | music | | chord: bass A#2, piano D3 G3 C4 F4 A#4, pad D3 G3 C4 F4 |
| 124.940 | music | | chord: bass A#2, piano A3 D4 D5 F5, pad A3 D4 F4 |
| 126.140 | music | | chord: bass A#2, piano G3 C4 G4 C5, pad G3 C4 G4 |
| 126.395 | key | -47 | the owl steps across the laptop keys |
| 126.960 | music | | chord: bass A#2, piano G3 A3 G4 C5, pad G3 A3 C4 |
| 126.965 | ping | -33 | a tiny boop under its foot |
| 127.750 | rumble | -41 | a soft low swell into the next chord |
| 128.650 | music | | chord: bass G2, piano G3 A#3 D4 F4, pad D3 G3 A#3 (+30 c) |

## s28  129.30-136.00 s  From behind the laptop: asleep, smiling

Piano chords on the beat (the source is ~30 cents sharp here), a waking breath, a bell blip.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
| 129.500 | music | | chord: bass A#2, piano D3 A3 C5 F5, pad D3 F3 A3 (+30 c) |
| 130.350 | music | | chord: bass A#2, piano F3 C4 F4 C5, pad F3 C4 F4 (+30 c) |
| 131.170 | music | | chord: bass A#2, piano D3 C4 F4 A4, pad D3 F3 A3 C4 (+30 c) |
| 131.720 | breath | -46 | a slow waking breath (131.75-131.95) |
| 131.940 | music | | chord: bass A#2, piano D3 G3 A3 D4 G4, pad D3 G3 A3 (+30 c) |
| 133.600 | blip | -32 | a soft bell blip |
| 133.600 | music | | chord: bass A#2, piano -, pad D3 G3 A3 (+30 c) |
| 134.440 | music | | chord: bass G2, piano G2 D3 A#3 F4 C5, pad D3 G3 A#3 F4 (+30 c) |
| 135.260 | music | | chord: bass F2, piano F3 A3 C4 A4 E5, pad F3 A3 C4 E4 (+30 c) |

## s40  136.00-140.80 s  End card

C major 7 pad, three airy ribbon whooshes, three little ticks (the owl's eyes), fade to silence at 140.62.


| time (s) | kind | level (dB) | what |
|---:|---|---|---|
| 136.100 | music | | chord: bass C2, piano E3 G3 B3 C4 E4, pad E3 G3 B3 C4 E4 G4 |
| 136.300 | air | -58 | airy ribbon whooshes (136.45, 137.45, 138.4) |
| 139.200 | tick | -48 | three little ticks: the owl's eyes (139.20, 139.27, 139.33) |
