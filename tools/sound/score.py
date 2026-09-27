#!/usr/bin/env python3
"""Render the whole soundtrack from the cue table: audio/score.wav (48 kHz, stereo, 24-bit, exactly 140.8 s).

    python3 tools/sound/score.py              # render audio/score.wav and write audio/CUES.md
    python3 tools/sound/score.py --stems DIR  # also write bed / drones / events / music stems

Deterministic: every random source is seeded; no file other than cues.py (+ the optional *_cal.json calibration
numbers next to it) is read. Nothing from the source film's audio is used."""
import json, os, sys, time
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import dsp
from dsp import SR, db, n_, tt, rng, lp, hp, bp, fade, peak_db, rms_db
import cues
import music
from kinds import KINDS, RMS_KINDS

DUR = 140.8
N = int(round(DUR * SR))           # 6 758 400 samples
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CF = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
CTRL = 1000                         # control rate for envelopes (Hz)


def load_cal(name):
    p = os.path.join(HERE, name)
    if os.path.exists(p):
        return json.load(open(p))
    return {}


# ------------------------------------------------------------------ bed
def bed_envelopes(keys, cal):
    """Per-band gain (dB) at control rate from BED keyframes: hold, then ramp into each keyframe."""
    nc = int(DUR * CTRL) + 2
    tc = np.arange(nc) / CTRL
    env = np.full((len(CF), nc), -120.0)
    pts = []  # (time, values) breakpoints
    prev = None
    for i, (t0, t1, bands, ramp, meas) in enumerate(keys):
        if bands is None:
            vals = np.full(len(CF), -120.0)
        else:
            vals = np.array(bands, float) + np.array(cal.get(str(i), [0.0] * len(CF)))
        if prev is None:
            pts.append((0.0, vals))
        else:
            pts.append((max(t0 - ramp, pts[-1][0] + 1e-4), prev))
        pts.append((t0, vals))
        pts.append((t1, vals))
        prev = vals
    pts.append((DUR + 1, prev))
    xs = np.array([p[0] for p in pts])
    for b in range(len(CF)):
        env[b] = np.interp(tc, xs, [p[1][b] for p in pts])
    return env


def render_bed(cal):
    env = bed_envelopes(cues.BED, cal)
    out = np.zeros((N, 2))
    r = rng(1001)
    tc = np.arange(env.shape[1]) / CTRL
    ta = np.arange(N) / SR
    for b, fc in enumerate(CF):
        lo, hi = fc / np.sqrt(2), min(fc * np.sqrt(2), SR / 2 * 0.95)
        base = dsp.white(DUR, 2000 + b)
        side = dsp.white(DUR, 3000 + b)
        sos = dsp.ss.butter(3, [lo, hi], "band", fs=SR, output="sos")
        m = dsp.ss.sosfilt(sos, base)
        s = dsp.ss.sosfilt(sos, side)
        m /= np.std(m) + 1e-12
        s /= np.std(s) + 1e-12
        # the room breathes a little: slow seeded level drift (+-1.2 dB)
        drift = dsp.lp(r.standard_normal(int(DUR * 50) + 2), 0.6, 1)
        drift = drift / (np.std(drift) + 1e-9) * 0.6
        g = db(np.interp(ta, tc, env[b]) + np.interp(ta, np.arange(len(drift)) / 50, drift))
        w = 0.12 if fc < 200 else 0.25                          # mostly-mono room tone, a little width up top
        out[:, 0] += g * (m * np.sqrt(1 - w * w) + s * w)
        out[:, 1] += g * (m * np.sqrt(1 - w * w) - s * w)
    # the colour world has no sub-bass air at all (the source is empty below ~50 Hz from 111 s): steep high-pass there
    x = np.clip((ta - 110.6) / 0.4, 0, 1)[:, None]
    return out * (1 - x) + hp(out, 52.0, 4) * x


# ------------------------------------------------------------------ drones & whines
def render_drones():
    out = np.zeros((N, 2))
    for k, (t0, t1, notes, lvl, fi, fo, cents) in enumerate(cues.DRONES):
        d = t1 - t0
        hz = [(dsp.nhz(nm, cents), rel) for nm, rel in notes]
        y = music.drone(hz, d, seed=500 + k, am_rate=0.1, am_depth=0.35)
        y *= db(lvl) / (np.sqrt(np.mean(y ** 2)) + 1e-12)
        t = tt(d)
        y *= np.clip(t / max(fi, 1e-3), 0, 1) * np.clip((d - t) / max(fo, 1e-3), 0, 1)
        i = n_(t0)
        seg = dsp.pan_st(y, 0.0)
        seg[:, 1] = np.roll(seg[:, 1], 7)                     # a hair of width
        out[i:i + len(y)] += seg[:N - i]
    for k, (t0, t1, f, lvl, fi, fo) in enumerate(cues.WHINES):
        d = t1 - t0
        y = __import__("sfx").whine(f, d, seed=700 + k)
        y *= db(lvl) / (np.sqrt(np.mean(y ** 2)) + 1e-12)
        t = tt(d)
        y *= np.clip(t / max(fi, 1e-3), 0, 1) * np.clip((d - t) / max(fo, 1e-3), 0, 1)
        i = n_(t0)
        out[i:i + len(y), 0] += y[:N - i]
        out[i:i + len(y), 1] += y[:N - i]
    return out


# ------------------------------------------------------------------ events
def event_id(e):
    return f"{e['kind']}@{e['t']:.3f}"


def render_events(cal):
    dry = np.zeros((N, 2))
    send = np.zeros((N, 2))
    for e in cues.EVENTS:
        kw = dict(e["kw"])
        kw.setdefault("seed", int(e["t"] * 1000) + len(e["kind"]))
        y = KINDS[e["kind"]](**kw)
        pre = 0.0
        if isinstance(y, tuple):                     # (signal, pre-roll): the sound's main transient is `pre` s in
            y, pre = y
        y = np.asarray(y, float)
        if y.ndim == 2:
            y = y.mean(1)
        if not np.any(y):
            continue
        lvl = e["lvl"] + cal.get(event_id(e), 0.0)
        ref = rms_db(y) if e["kind"] in RMS_KINDS else peak_db(y, 0.02)
        y = y * db(lvl - ref)
        st = dsp.pan_st(y, e["pan"])
        i = n_(e["t"] + cues.EVENT_OFFSET - pre)
        if i < 0:
            st, y, i = st[-i:], y[-i:], 0
        j = min(N, i + len(y))
        if j <= i:
            continue
        dry[i:j] += st[:j - i]
        send[i:j] += st[:j - i] * e["send"]
    return dry, send


# ------------------------------------------------------------------ music
def render_music(cal):
    """Colour-section score: felt piano chords (rolled, pedalled), a warm pad, bass, a high string shimmer."""
    out = np.zeros((N, 2))
    ch = cues.MUSIC
    for k, (t0, d, pno, padn, bass, vel, cents) in enumerate(ch):
        nxt = ch[k + 1][0] if k + 1 < len(ch) else DUR
        g = db(cues.MUSIC_GAIN + cal.get(f"{t0:.2f}", 0.0))
        ring = min(DUR - t0, (nxt - t0) + 1.5)                     # sustain pedal: ring over the next chord a little
        a = n_(t0)
        for i, nm in enumerate(pno):
            f = dsp.nhz(nm, cents)
            y = music.piano(f, ring, vel, seed=9000 + k * 17 + i, bright=1.0, felt=0.45, release=(nxt - t0) + 0.5,
                            punch=cues.PIANO_PUNCH, sus=cues.PIANO_SUS)
            y *= db(-1.5 * i) * 0.3 * g
            p = float(np.clip((dsp.note_midi(nm) - 60) / 30, -0.5, 0.5))   # low notes left, high notes right
            st = dsp.pan_st(y, p)
            ai = n_(t0 + 0.006 * i)                                      # a slightly rolled chord
            out[ai:ai + len(y)] += st[:N - ai]
        # pad: crossfades chord to chord
        pd = min((nxt - t0) + 0.6, DUR - t0)
        hz = [dsp.nhz(nm, cents) for nm in padn]
        y = music.pad(hz, pd, att=0.35 if k else 0.8, rel=0.6, bright=2400, seed=9500 + k)
        y = hp(y, 140)
        y *= db(cues.PAD_REL) * 0.3 / (np.sqrt(np.mean(y ** 2)) + 1e-12) * g
        out[a:a + len(y)] += np.stack([y, np.roll(y, 240)], 1)[:N - a]
        # bass
        if bass:
            fb = dsp.nhz(bass, cents)
            bd = min((nxt - t0) + 0.3, DUR - t0)
            yb = music.sub(fb, bd, att=0.01, rel=0.3) * 0.3 * db(cues.BASS_REL)
            yb *= 0.35 + 0.65 * np.exp(-tt(bd) / cues.BASS_DECAY)
            yb += music.piano(fb, bd, vel * 0.8, seed=9900 + k, felt=0.9, punch=2.0) * 0.12
            yb *= db(cal.get(f"bass@{t0:.2f}", 0.0))
            out[a:a + len(yb)] += dsp.pan_st(yb * g, 0.0)[:N - a]
    # voicing of the whole music bus: warmer and more mid-forward, like the source's felt piano + pad
    out = dsp.peak_eq(out, 900.0, 2.5, 0.8)
    out = dsp.peak_eq(out, 450.0, -3.5, 1.0)
    out = dsp.peak_eq(out, 160.0, -2.0, 0.8)
    out = lp(out, 3800.0, 2)
    out = hp(out, 50.0, 4)
    for k, (t0, t1, notes, lvl) in enumerate(cues.SHIMMER):
        d = t1 - t0
        y = music.strings([dsp.nhz(n) for n in notes], d, att=1.5, rel=1.5, bright=2500, seed=9700 + k, nharm=3)
        y *= db(lvl) / (np.sqrt(np.mean(y ** 2)) + 1e-12)
        a = n_(t0)
        out[a:a + len(y)] += np.stack([y, np.roll(y, 300)], 1)[:N - a]
    return out


# ------------------------------------------------------------------ master
def master(parts, send, music_bus):
    mix = sum(parts)
    t = np.arange(N) / SR
    room = dsp.make_ir(t60=0.85, seed=11, lp_hz=5000, hp_hz=90, pre=0.008)
    hall = dsp.make_ir(t60=2.2, seed=12, lp_hz=7000, hp_hz=120, pre=0.02)
    x = np.clip((t - 110.4) / 0.4, 0, 1)[:, None]                 # the colour world is a bigger, brighter space
    wet = dsp.convolve_st(send * (1 - x), room)[:N] * db(-8) + dsp.convolve_st(send * x, hall)[:N] * db(-6)
    mwet = dsp.convolve_st(music_bus, hall)[:N] * db(-14)
    mix = mix + wet + music_bus + mwet
    # final fade: the source fades from ~139.5 and is silent from 140.62
    f = np.ones(N)
    a, b = n_(139.55), n_(140.62)
    f[a:b] = np.cos(np.linspace(0, np.pi / 2, b - a)) ** 1.6
    f[b:] = 0
    mix *= f[:, None]
    mix = dsp.soft_clip(mix, 0.85)
    pk = np.abs(mix).max()
    if pk > 0.93:
        mix *= 0.93 / pk
    return mix


def write_cues_md(path, cal=None):
    cal = cal or {}
    L = []
    L.append("# Soundtrack cue list (140.8 s)\n")
    L.append("Every sound in `audio/score.wav` is synthesized by `tools/sound/score.py` from the cue table in "
             "`tools/sound/cues.py` (regenerate: `python3 tools/sound/score.py`). Times, pitches and levels were measured on "
             "the source film's audio track (analysis only -- no source audio is used). Generated from the cue table; do not "
             "edit by hand.\n")
    L.append("- **level** = 20 ms peak of the event alone, dBFS (mid), after the per-event mix trim in `lvl_cal.json`; "
             "drones/whines are rms; `L0.5` / `R0.5` = pan.")
    L.append("- **Whole-film shape**: 0-110 s black-and-white horror section -- no score, only room tone, dark tonal drones and "
             "close foley; 92.66-97.57 an electric storm; 103-110.5 a stomping 3+3+2 pulse at 120 BPM over a G drone. "
             "110.6-111.6 two blow-out hits into colour; music from 114.87: felt piano + warm pad + bass + a high string "
             "shimmer, F major / D minor, ~71 BPM (chords every ~0.84 s), the 128.65-136.0 stretch sits ~30 cents sharp; "
             "136.1 a C major 7 end chord that fades to silence at 140.62.")
    L.append("- **Room tone** is a 10-band noise bed whose band levels follow keyframes measured on the source (see BED in "
             "cues.py); dropouts at the hard cuts are reproduced.\n")
    for sid, a, b, title, summ in cues.SECTIONS:
        L.append(f"\n## {sid}  {a:.2f}-{b:.2f} s  {title}\n")
        L.append(f"{summ}\n")
        rows = []
        for e in cues.EVENTS:
            if a <= e["t"] < b and e["desc"]:
                pan = "" if abs(e["pan"]) < 0.05 else (f" L{abs(e['pan']):.1f}" if e["pan"] < 0 else f" R{e['pan']:.1f}")
                lv = e["lvl"] + cal.get(event_id(e), 0.0)
                rows.append((e["t"], f"| {e['t']:7.3f} | {e['kind']} | {lv:.0f}{pan} | {e['desc']} |"))
        for t0, t1, notes, lvl, fi, fo, cents in cues.DRONES:
            if a <= t0 < b:
                rows.append((t0, f"| {t0:7.3f} | drone | {lvl:.0f} | {'-'.join(n for n, _ in notes)} drone to {t1:.2f}"
                                 f"{f' ({cents:+d} c)' if cents else ''} |"))
        for t0, t1, f, lvl, fi, fo in cues.WHINES:
            if a <= t0 < b:
                rows.append((t0, f"| {t0:7.3f} | whine | {lvl:.0f} | thin steady {f:.0f} Hz tone to {t1:.2f} |"))
        for t0, d, pno, padn, bass, vel, cents in cues.MUSIC:
            if a <= t0 < b:
                rows.append((t0, f"| {t0:7.3f} | music | | chord: bass {bass}, piano {' '.join(pno) or '-'}, pad {' '.join(padn)}"
                                 f"{f' ({cents:+d} c)' if cents else ''} |"))
        for i, (t0, t1, bands, ramp, meas) in enumerate(cues.BED):
            if bands is None and a <= t0 < b and t1 - t0 < 0.1:
                rows.append((t0, f"| {t0:7.3f} | dropout | | the sound drops out for {1000 * (t1 - t0):.0f} ms at the cut |"))
        if rows:
            L.append("\n| time (s) | kind | level (dB) | what |\n|---:|---|---|---|")
            L += [r for _, r in sorted(rows, key=lambda z: z[0])]
    open(path, "w").write("\n".join(L) + "\n")


def main():
    t0 = time.time()
    stems = sys.argv[sys.argv.index("--stems") + 1] if "--stems" in sys.argv else None
    out = os.path.join(ROOT, "audio", "score.wav")
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]
    bedcal, lvlcal, muscal = load_cal("bed_cal.json"), load_cal("lvl_cal.json"), load_cal("music_cal.json")
    bed = render_bed(bedcal)
    dr = render_drones()
    ev_dry, ev_send = render_events(lvlcal)
    mus = render_music(muscal)
    mix = master([bed, dr, ev_dry], ev_send + 0.25 * dr, mus)
    assert mix.shape == (N, 2)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sf.write(out, mix.astype(np.float32), SR, subtype="PCM_24")
    if stems:
        os.makedirs(stems, exist_ok=True)
        for nm, x in [("bed", bed), ("drones", dr), ("events", ev_dry), ("music", mus)]:
            sf.write(os.path.join(stems, nm + ".wav"), x.astype(np.float32), SR, subtype="FLOAT")
    write_cues_md(os.path.join(ROOT, "audio", "CUES.md"), lvlcal)
    print(f"wrote {out}  {mix.shape[0] / SR:.3f} s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  "
          f"({len(cues.EVENTS)} events, {time.time() - t0:.0f} s)")


if __name__ == "__main__":
    main()
