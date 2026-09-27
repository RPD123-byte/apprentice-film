#!/usr/bin/env python3
"""Mix calibration (ANALYSIS ONLY): measure the render against the source and nudge the cue table's level numbers.

  python3 tools/sound/calibrate.py [score.wav] [--events] [--bed] [--music] [--rate 0.8]

Writes per-keyframe band offsets (bed_cal.json), per-event level offsets (lvl_cal.json) and per-chord music offsets
(music_cal.json) next to this script. These are a few hundred scalar gains -- the mix engineer's faders -- measured
section by section; no audio from the source ever enters the score."""
import json, os, sys
import numpy as np, soundfile as sf, scipy.signal as ss

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import cues
from kinds import RMS_KINDS

args = [a for a in sys.argv[1:] if not a.startswith("--")]
SCORE = args[0] if args else os.path.join(ROOT, "audio", "score.wav")
SRC = os.path.join(ROOT, "snapshots", "audio-work", "src.wav")
RATE = float(sys.argv[sys.argv.index("--rate") + 1]) if "--rate" in sys.argv else 0.8
ALL = not any(f in sys.argv for f in ("--events", "--bed", "--music"))
CF = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

a, sr = sf.read(SRC, always_2d=True)
b, _ = sf.read(SCORE, always_2d=True)
a, b = a.mean(1), b.mean(1)
n = min(len(a), len(b))
a, b = a[:n], b[:n]


def jload(name):
    p = os.path.join(HERE, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def jsave(name, d):
    json.dump(d, open(os.path.join(HERE, name), "w"), indent=0, sort_keys=True)


def lev(x):
    return 10 * np.log10(np.mean(x ** 2) + 1e-14)


def peak(x, t, w0=-0.01, w1=0.06, win=0.02):
    i0, i1 = int((t + w0) * sr), int((t + w1) * sr)
    y = x[max(0, i0):i1]
    w = int(win * sr)
    if len(y) <= w:
        return lev(y)
    c = np.convolve(y ** 2, np.ones(w) / w, "valid")
    return 10 * np.log10(c.max() + 1e-14)


SUSTAINED = {"rumble", "riser_cluster", "electric", "crackle_bed", "tear", "dust", "birds", "air", "shimmer"}
TICKS = {"tap", "click", "key", "snip", "tick", "crinkle", "shard", "snap"}   # tiny transients: matched above 1.5 kHz
_hs = ss.butter(4, 1500, "high", fs=sr, output="sos")
ah, bh = ss.sosfiltfilt(_hs, a), ss.sosfiltfilt(_hs, b)

if ALL or "--events" in sys.argv:
    from kinds import KINDS
    from dsp import peak_db as _pk
    cal = jload("lvl_cal.json")
    changed = 0
    for e in cues.EVENTS:
        kw = dict(e["kw"]); kw.setdefault("seed", int(e["t"] * 1000) + len(e["kind"]))
        y = KINDS[e["kind"]](**kw)
        pre = 0.0
        if isinstance(y, tuple):
            y, pre = y
        y = np.asarray(y, float)
        if y.ndim == 2:
            y = y.mean(1)
        sus = e["kind"] in SUSTAINED or (e["kind"] == "whoosh" and len(y) > 0.45 * sr)
        win = 0.1 if sus else 0.02
        w = int(win * sr)
        c = np.convolve(y ** 2, np.ones(w) / w, "valid") if len(y) > w else y ** 2
        tp = e["t"] + cues.EVENT_OFFSET - pre + (int(np.argmax(c)) + w / 2) / sr   # when this event peaks in the render
        tol = 0.05 if sus else 0.012
        xa, xb = (ah, bh) if e["kind"] in TICKS else (a, b)
        ps, pr = peak(xa, tp, -tol - win / 2, tol + win / 2, win), peak(xb, tp, -tol - win / 2, tol + win / 2, win)
        pre_s = lev(xa[max(0, int((e["t"] - 0.15) * sr)):max(1, int((e["t"] - 0.02) * sr))])
        if ps - pre_s < (1.5 if sus else (2.5 if e["kind"] in TICKS else 4)):
            continue                                                         # not prominent in the source: leave it
        k = f"{e['kind']}@{e['t']:.3f}"
        d = np.clip((ps - pr) * RATE, -5, 5)
        cal[k] = float(np.clip(cal.get(k, 0.0) + d, -14, 14))
        changed += 1
    jsave("lvl_cal.json", cal)
    print(f"events: adjusted {changed}")

if ALL or "--bed" in sys.argv:
    sys.path.insert(0, HERE)
    from bands import band_levels
    cal = jload("bed_cal.json")
    for i, (t0, t1, bands, ramp, meas) in enumerate(cues.BED):
        if bands is None or meas is None:
            continue
        i0, i1 = int(meas[0] * sr), int(meas[1] * sr)
        ls = np.array(band_levels(a[i0:i1], sr, 25))
        lr = np.array(band_levels(b[i0:i1], sr, 25))
        d = np.clip((ls - lr) * RATE, -8, 8)
        old = np.array(cal.get(str(i), [0.0] * len(CF)))
        cal[str(i)] = [float(v) for v in np.clip(old + d, -30, 15)]
        print(f"bed {i:2d} {meas[0]:6.2f}-{meas[1]:6.2f}  err " + " ".join(f"{v:+5.1f}" for v in (ls - lr)))
    jsave("bed_cal.json", cal)

if ALL or "--music" in sys.argv:
    cal = jload("music_cal.json")
    ch = cues.MUSIC
    sos = ss.butter(4, [150, 2500], "band", fs=sr, output="sos")
    fa, fb = ss.sosfiltfilt(sos, a[int(110 * sr):]), ss.sosfiltfilt(sos, b[int(110 * sr):])
    o = int(110 * sr)
    for k, (t0, d, *_r) in enumerate(ch):
        t1 = ch[k + 1][0] if k + 1 < len(ch) else 140.3
        i0, i1 = int((t0 + 0.05) * sr) - o, int((t1 - 0.03) * sr) - o
        ls, lr = lev(fa[i0:i1]), lev(fb[i0:i1])
        key = f"{t0:.2f}"
        cal[key] = float(np.clip(cal.get(key, 0.0) + np.clip((ls - lr) * RATE, -8, 8), -25, 12))
        print(f"music {t0:7.2f}  src {ls:6.1f}  score {lr:6.1f}")
    # bass (40-150 Hz) per chord
    sosb = ss.butter(4, [40, 150], "band", fs=sr, output="sos")
    ba, bb = ss.sosfiltfilt(sosb, a[o:]), ss.sosfiltfilt(sosb, b[o:])
    for k, (t0, d, *_r) in enumerate(ch):
        t1 = ch[k + 1][0] if k + 1 < len(ch) else 140.3
        i0, i1 = int((t0 + 0.02) * sr) - o, int((t0 + min(0.5, t1 - t0 - 0.03)) * sr) - o
        ls, lr = lev(ba[i0:i1]), lev(bb[i0:i1])
        key = f"bass@{t0:.2f}"
        cal[key] = float(np.clip(cal.get(key, 0.0) + np.clip((ls - lr) * RATE, -8, 8), -30, 20))
        print(f"bass  {t0:7.2f}  src {ls:6.1f}  score {lr:6.1f}")
    jsave("music_cal.json", cal)
