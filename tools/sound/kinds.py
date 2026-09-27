"""Registry: cue kind -> synthesized mono (or stereo) signal. Composite sounds are built here from sfx/music primitives."""
import numpy as np
import sfx
import music
from dsp import (SR, rng, n_, tt, db, white, brown, pink, lp, hp, bp, reson, tv_filter, sweep_filter, swell, fade, modal,
                 additive, sine, nhz)


def riser_cluster(seed=0, dur=2.7):
    """Rising glassy cluster (the pan off his face): detuned partials gliding up ~+45 %, getting brighter, cut dead."""
    r = rng(seed)
    t = tt(dur)
    y = np.zeros(len(t))
    for k, f0 in enumerate([520, 610, 740, 880, 1010, 1250, 1580, 1990, 2400, 3100, 4200]):
        g = 1 + 0.45 * (t / dur) ** 1.3 * r.uniform(0.8, 1.2)
        a = db(-3 * k / 3) * r.uniform(0.6, 1.0)
        y += a * np.sin(2 * np.pi * np.cumsum(f0 * g) / SR + r.uniform(0, 6)) * (0.6 + 0.4 * np.sin(2 * np.pi * r.uniform(2, 6) * t))
    y += 0.5 * sfx.whoosh(seed + 1, dur, 400, 4000, 0.95, 0.8, 0.1, 2.5, 0.2)
    e = np.clip(t / dur, 0, 1) ** 1.6
    return y * e * np.clip((dur - t) / 0.004, 0, 1)


def bloop(seed=0, dur=0.8):
    """Soft UI chime: a quick downward glint then a sustained 1.05/1.6/2.1 kHz tone."""
    t = tt(dur)
    g = sfx.chirp([(0, 6000), (0.08, 3000), (0.14, 2600)], 0.15, seed, ((1, 1.0),))
    y = np.zeros(len(t))
    y[:len(g)] += 0.5 * g
    tone = sum(a * np.sin(2 * np.pi * f * t) for f, a in [(1050, 1.0), (1580, 0.8), (2100, 0.6)])
    e = np.clip((t - 0.1) / 0.05, 0, 1) * np.clip((dur - t) / 0.12, 0, 1)
    return y + 0.6 * tone * e


def dust(seed=0, dur=0.6):
    nz = white(dur, seed)
    y = lp(nz, 700) * 0.8 + bp(nz, 700, 2500) * 0.25
    return y * swell(dur, 0.3, 1.2, 1.5) * (0.6 + 0.4 * np.abs(lp(white(dur, seed + 2), 20)) * 5).clip(0, 1.5)


def cluster(seed=0, notes=(), vel=0.8, dur=0.9, decay=0.28):
    """Keys struck by the owl's feet: a bright synth-piano cluster (odd-heavy harmonics, fast upper decay) + foot thump."""
    t = tt(dur)
    y = np.zeros(len(t))
    r = rng(seed)
    for i, nm in enumerate(notes):
        f = nhz(nm, r.uniform(-12, 12))
        nh = int(min(14, 3500 // f + 1))
        parts = [(k, (1.0 / k ** 1.3) * (1.0 if k % 2 else 0.5), decay * (1.6 / (1 + 0.4 * k))) for k in range(1, nh + 1)]
        y += additive(f * (1 + r.uniform(-0.002, 0.002)), dur, parts, seed * 31 + i) * (0.7 + 0.3 * r.uniform())
    y *= np.minimum(1, t / 0.002)
    y += 0.8 * lp(white(dur, seed + 5), 900) * np.exp(-t / 0.02) * np.sqrt(len(notes))
    y += 0.9 * bp(white(dur, seed + 6), 2000, 12000) * np.exp(-t / 0.005) * np.sqrt(len(notes))   # key clack
    return y


def crash(seed=0, dur=0.9):
    """Heavy clatter of the keyboard coming down."""
    t = tt(dur)
    y = 0.8 * lp(white(dur, seed), 5000) * np.exp(-t / 0.08)
    for k in range(7):
        t0 = rng(seed + k).uniform(0, 0.25)
        c = sfx.click(seed + k, rng(seed + k).uniform(500, 1500), 1.2, 0.1)
        i = n_(t0)
        y[i:i + len(c)] += 0.6 * c[:len(y) - i]
    return y


def pop(seed=0, dur=0.35):
    """Papery pop: a sharp paper snap + a hollow low pop."""
    t = tt(dur)
    y = 1.2 * bp(white(dur, seed), 800, 9000) * np.exp(-t / 0.012)
    y += np.sin(2 * np.pi * (250 + 500 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.05) * 0.8
    y += 0.4 * sfx.crackle(seed + 1, dur, 80, 1500, 8000) * np.exp(-t / 0.08)
    return y


def crinkle(seed=0, dur=0.08):
    return sfx.crackle(seed, dur, 250, 1500, 9000) * np.exp(-tt(dur) / 0.03)


def shimmer(seed=0, f=2700.0, dur=0.75):
    t = tt(dur)
    y = sum(a * np.sin(2 * np.pi * f * m * t + k) for k, (m, a) in enumerate([(1, 1.0), (1.004, 0.8), (2.0, 0.05)]))
    return y * np.minimum(1, t / 0.06) * np.clip((dur - t) / 0.4, 0, 1) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t))


def electric(seed=0, dur=4.9):
    """The ignited banner: a distorted, warbling synth chord (A-E-A-C#, saw stacks through tanh) over a sub rumble,
    with bright electric partials sliding about 1-3 kHz."""
    t = tt(dur)
    r = rng(seed)
    y = np.zeros(len(t))
    for i, f in enumerate([55.0, 82.4, 110.0, 138.6, 164.8, 220.0]):
        fm_ = f * (1 + 0.004 * np.sin(2 * np.pi * r.uniform(3, 6) * t + r.uniform(0, 6)))
        nh = int(min(30, 4000 // f))
        y += db(-2 * i) * additive(fm_, dur, [(k, 1.0 / k, None) for k in range(1, nh + 1)], seed + i)
    y = np.tanh(1.8 * y / (np.std(y) + 1e-9)) * 0.5
    war = np.zeros(len(t))
    for k in range(11):                                   # a thicket of warbling partials between ~450 Hz and 2.6 kHz
        f0 = 220.0 * (k + 2) * r.uniform(0.97, 1.03)
        fm_ = f0 * (1 + 0.035 * np.sin(2 * np.pi * r.uniform(0.6, 2.5) * t + r.uniform(0, 6)))
        war += db(-3 - 1.2 * k) * np.sin(2 * np.pi * np.cumsum(fm_) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * r.uniform(0.3, 1.2) * t + k))
    sub_ = lp(brown(dur, seed + 3), 90, 4) * 1.5
    e = 0.55 + 0.45 * np.exp(-t / 1.5)
    out = (lp(y, 5000) + 0.35 * war + sub_) * e
    return out * np.minimum(1, t / 0.01)


def crackle_bed(seed=0, dur=4.9):
    t = tt(dur)
    c = sfx.crackle(seed, dur, 90, 2000, 12000, 1.0)
    return c * (0.5 + 0.5 * np.exp(-t / 1.5))


def shard(seed=0):
    """Glass shard tinkle: two or three high inharmonic pings."""
    r = rng(seed)
    y = np.zeros(n_(0.4))
    for k in range(3):
        f = r.uniform(2500, 7500)
        p = modal(0.35, [(f, 0.25, 1.0), (f * 2.63, 0.1, 0.4)], None, seed + k)
        i = n_(r.uniform(0, 0.03))
        y[i:i + len(p)] += p[:len(y) - i] * r.uniform(0.4, 1.0)
    y[:n_(0.004)] += hp(white(0.004, seed), 3000) * 0.8
    return y


def shardfall(seed=0, dur=0.3):
    """A shard whooshing past: air + a falling chirp (as seen 101.6, 102.1)."""
    w = sfx.whoosh(seed, dur, 3000, 700, 0.3, 1.0, 0.5)
    c = sfx.voice([(0, 520), (0.15, 380), (0.28, 300)], dur, seed, [(700, 1.0, 5), (1500, 0.5, 6)], noise=0.3, tilt=1.2)
    return w + 0.6 * c


def whoop(seed=0, dur=0.85):
    """Rising whoop at the landing: G3 -> A#3, then a D#4 blip."""
    t = tt(dur)
    f = np.interp(t, [0, 0.15, 0.55, 0.85], [196, 205, 233, 236])
    y = additive(f, dur, [(1, 1.0, None), (2, 0.4, None), (3, 0.2, None)], seed) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)
    b = additive(311, 0.25, [(1, 1, None), (2, 0.3, None)], seed + 1) * np.exp(-tt(0.25) / 0.08)
    i = n_(0.78)
    y[i:i + len(b)] += 0.5 * b[:len(y) - i]
    return y


def kick(seed=0):
    """Low stomp (tom-like): body gliding 260 -> 95 Hz, soft click."""
    d = 0.4
    t = tt(d)
    f = 95 + 165 * np.exp(-t / 0.05)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)
    y += 0.4 * np.sin(2 * np.pi * np.cumsum(f * 2.02) / SR) * np.exp(-t / 0.06)
    y += 0.15 * hp(white(d, seed), 1500) * np.exp(-t / 0.004)
    return y * np.minimum(1, t / 0.001)


def snap(seed=0):
    d = 0.12
    t = tt(d)
    y = bp(white(d, seed), 1200, 7000) * np.exp(-t / 0.01) + 0.5 * reson(white(d, seed + 1), 1800, 6) * np.exp(-t / 0.02)
    return y


def blowout(seed=0, dur=1.0):
    """Big blow-out hit: broadband burst with a long noisy (roaring) tail and a sub."""
    t = tt(dur)
    y = 1.2 * lp(white(dur, seed), 12000) * np.exp(-t / 0.05)
    y += 0.8 * sweep_filter(pink(dur, seed + 1), 4000, 600, "band", 2.5, 16) * np.exp(-t / (dur * 0.45))
    y += 0.7 * lp(brown(dur, seed + 2), 150) * np.exp(-t / (dur * 0.5))
    return y * np.minimum(1, t / 0.002)


def blip(seed=0, dur=0.6):
    """A soft bell blip: bright transient + a short low bell tone (B3/C4) as seen at 133.6."""
    t = tt(dur)
    y = hp(white(dur, seed), 3000) * np.exp(-t / 0.004) * 0.6
    y += sfx.bell(255.0, dur, seed, bright=0.8, t60=0.5)
    return y


def air(seed=0, dur=0.5, lo=3000, hi=11000):
    return bp(white(dur, seed), lo, hi) * swell(dur, 0.45, 1.8, 1.8)


def tick(seed=0):
    d = 0.05
    t = tt(d)
    return reson(white(d, seed), 1100, 8) * np.exp(-t / 0.008) + 0.3 * hp(white(d, seed + 1), 3000) * np.exp(-t / 0.002)


KINDS = {
    "click": lambda seed=0, **k: sfx.click(seed, **k),
    "key": lambda seed=0, **k: sfx.key(seed, **k),
    "tap": lambda seed=0, **k: sfx.tap(seed, **k),
    "scratch": lambda seed=0, **k: sfx.scratch(seed, **k),
    "thud": lambda seed=0, **k: sfx.thud(seed, **k),
    "boom": lambda seed=0, **k: sfx.boom(seed, **k),
    "flump": lambda seed=0, **k: sfx.flump(seed, **k),
    "whoosh": lambda seed=0, **k: sfx.whoosh(seed, **k),
    "rumble": lambda seed=0, **k: sfx.rumble(seed, **k),
    "breath": lambda seed=0, **k: sfx.breath(seed, **k),
    "wingflap": lambda seed=0, **k: sfx.wingflap(seed, **k),
    "voice": lambda seed=0, contour=None, dur=0.2, **k: sfx.voice(contour, dur, seed, **k),
    "chirp": lambda seed=0, contour=None, dur=0.1, **k: sfx.chirp(contour, dur, seed, **k),
    "ping": lambda seed=0, **k: sfx.ping(seed=seed, **k),
    "shing": lambda seed=0, **k: sfx.shing(seed, **k),
    "snip": lambda seed=0, second=0.03, **k: (sfx.snip(seed, second=second, **k), second),
    "tear": lambda seed=0, **k: sfx.tear(seed, **k),
    "riser": lambda seed=0, **k: sfx.riser(seed, **k),
    "birds": lambda seed=0, **k: sfx.birdsong(seed, **k),
    "riser_cluster": riser_cluster, "bloop": bloop, "dust": dust, "cluster": cluster, "crash": crash, "pop": pop,
    "crinkle": crinkle, "shimmer": shimmer, "electric": electric, "crackle_bed": crackle_bed, "shard": shard,
    "shardfall": shardfall, "whoop": whoop, "kick": kick, "snap": snap, "blowout": blowout, "blip": blip, "air": air,
    "tick": tick,
}

# events whose level is a sustained (rms) level rather than a 20 ms peak
RMS_KINDS = {"electric", "crackle_bed", "riser_cluster", "tear"}
