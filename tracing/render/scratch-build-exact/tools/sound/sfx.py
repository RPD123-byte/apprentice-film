"""Sound objects (foley + design), all synthesized. Each returns a mono float array (or (n,2) when noted), unnormalized;
the mixer scales every object to its cue level (20 ms peak, dBFS)."""
import numpy as np
from dsp import (SR, rng, n_, tt, db, white, pink, brown, lp, hp, bp, reson, peak_eq, tv_filter, sweep_filter, env_ad,
                 env_pts, swell, fade, sine, additive, modal, karplus, fm, nhz)


# ------------------------------------------------------------------ clicks, keys, taps
def click(seed=0, body=1000.0, bright=1.0, dur=0.08, release=None):
    """Trackpad / mouse click: a hard plastic tick (short noise burst into a few stiff modes) + faint body."""
    r = rng(seed)
    exc = white(0.0025, seed) * np.linspace(1, 0, n_(0.0025))
    modes = [(body * r.uniform(0.95, 1.05), 0.018, 1.0),
             (body * 2.3 * r.uniform(0.95, 1.05), 0.012, 0.7 * bright),
             (body * 4.9 * r.uniform(0.95, 1.05), 0.008, 0.6 * bright),
             (body * 8.7 * r.uniform(0.95, 1.05), 0.006, 0.4 * bright)]
    y = modal(dur, modes, exc, seed)
    y += 0.8 * np.pad(hp(exc, 3000), (0, n_(dur) - len(exc))) * bright
    y += 0.25 * sine(body * 0.2, dur) * np.exp(-tt(dur) / 0.006)
    if release:
        d2 = int(release * SR)
        y2 = click(seed + 7, body * 1.15, bright * 0.6, dur, None) * 0.35
        y = np.pad(y, (0, d2))
        y[d2:d2 + len(y2)] += y2[:len(y) - d2]
    return fade(y, 0.0005, 0.01)


def key(seed=0, hard=0.6, dur=0.12):
    """Laptop keystroke: a short broadband plastic click (filtered noise, 0.6-12 kHz, one soft resonance), the keybed's
    low 'thock' (200-300 Hz), and a faint release tick 50-80 ms later."""
    r = rng(seed)
    t = tt(dur)
    nz = white(dur, seed)
    hit = bp(nz, 600, 12000) * np.exp(-t / 0.0035)
    hit += 0.6 * reson(nz, r.uniform(1500, 3200), 3.0) * np.exp(-t / 0.006)
    y = hit + (0.35 + 0.5 * hard) * reson(white(dur, seed + 1), r.uniform(200, 300), 4.0) * np.exp(-t / 0.02) * 11.0
    rel = int(r.uniform(0.05, 0.085) * SR)
    if rel < len(y) - 300:
        e2 = bp(white(0.004, seed + 3), 1500, 10000) * np.exp(-np.arange(n_(0.004)) / (0.0012 * SR)) * 0.3
        y[rel:rel + len(e2)] += e2
    return fade(y, 0.0002, 0.02)


def tap(seed=0, f=1400.0, low=0.4, dur=0.06, q=4.0):
    """Tiny footstep / claw tap: a band-limited tick with a little low body."""
    r = rng(seed)
    n = white(dur, seed) * np.exp(-tt(dur) / 0.004)
    y = reson(n, f * r.uniform(0.85, 1.15), q) * 2.0 + 0.4 * bp(n, 2500, 12000)
    y += low * sine(r.uniform(120, 220), dur) * np.exp(-tt(dur) / 0.01)
    return fade(y, 0.0003, 0.01)


def scratch(seed=0, dur=0.25, f=2500.0):
    """Claws on cardboard: rapid irregular micro-ticks through a papery band."""
    r = rng(seed)
    n = n_(dur)
    y = np.zeros(n)
    t = 0
    while t < n - 400:
        g = white(0.003, seed + t) * np.exp(-np.arange(n_(0.003)) / (0.0008 * SR))
        y[t:t + len(g)] += g * r.uniform(0.3, 1.0)
        t += int(r.uniform(0.006, 0.02) * SR)
    return bp(y, f * 0.4, f * 2.5) * swell(dur, 0.3, 1, 1.5)


# ------------------------------------------------------------------ impacts
def thud(seed=0, f0=55.0, dur=1.6, click_amt=0.4, bright=1500.0, tail=0.35, drop=0.35, box=0.8):
    """Soft impact on a hollow body (cardboard / desk / fabric): a membrane-like low sine that drops in pitch, a burst
    through a few box modes (the 150 Hz - 1.5 kHz 'knock' of the source's thumps), and a small contact click."""
    r = rng(seed)
    t = tt(dur)
    f = f0 * (1 + drop * np.exp(-t / 0.05))
    y = 0.8 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tail) * np.minimum(1, t / 0.002)
    exc = white(dur, seed) * np.exp(-t / 0.006)
    fb = max(140.0, f0 * 2.2)
    for k, (m, q) in enumerate([(1.0, 6), (1.85, 7), (2.9, 8), (4.3, 9), (6.1, 10)]):
        fk = fb * m * r.uniform(0.92, 1.08)
        if fk < bright * 1.3:
            y += box * 1.6 * reson(exc, fk, q) * (0.8 ** k)
    y += 0.5 * lp(white(dur, seed + 2), bright) * np.exp(-t / 0.03)
    y += click_amt * hp(white(dur, seed + 1), 2000) * np.exp(-t / 0.003)
    return fade(y, 0.0005, 0.05)


def boom(seed=0, f0=45.0, dur=3.0, tail=0.9, noise_tail=0.4, bright=900.0, click_amt=0.5):
    """Cinematic low hit: long sub drop + rumble tail + transient."""
    t = tt(dur)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.08))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tail) * np.minimum(1, t / 0.003)
    y += 0.9 * lp(brown(dur, seed), bright) * np.exp(-t / noise_tail)
    y += 0.5 * lp(white(dur, seed + 1), 4000) * np.exp(-t / 0.03)
    y += click_amt * hp(white(dur, seed + 2), 1500) * np.exp(-t / 0.006)
    return fade(y, 0.0005, 0.2)


def flump(seed=0, dur=0.5, f0=70.0):
    """Heavy papery flump: low whump + papery noise that sweeps down."""
    t = tt(dur)
    y = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.08) * np.minimum(1, t / 0.004)
    nz = white(dur, seed)
    y += 0.9 * sweep_filter(nz, 3000, 400, "band", 2.0, 12) * np.exp(-t / 0.09)
    y += 0.6 * lp(nz, 600) * np.exp(-t / 0.06)
    return fade(y, 0.001, 0.05)


# ------------------------------------------------------------------ air
def whoosh(seed=0, dur=0.8, f0=300.0, f1=2500.0, peak=0.5, q=1.2, low=0.3, p1=2.0, p2=2.0):
    """Air rush: noise through a moving resonant band (f0 -> f1), swell envelope."""
    nz = white(dur, seed)
    fc = f0 * (f1 / f0) ** np.linspace(0, 1, len(nz))
    y = tv_filter(nz, fc, q, "band")
    y += low * lp(nz, 250)
    return y * swell(dur, peak, p1, p2)


def rumble(seed=0, dur=2.0, peak=0.6, cutoff=120.0, p1=2.0, p2=2.0, mid=0.15):
    """Low air / camera-move rumble swell."""
    nz = brown(dur, seed)
    y = lp(nz, cutoff, 4) + mid * bp(white(dur, seed + 1), 200, 900)
    return y * swell(dur, peak, p1, p2)


def breath(seed=0, dur=0.35, peak=0.45, formants=((500, 1.0), (1100, 0.8), (2400, 0.6), (3600, 0.4)), air=0.5, inh=True):
    """Breath: noise through vocal-tract-like resonances."""
    nz = white(dur, seed)
    y = sum(a * reson(nz, f, 5.0) for f, a in formants) + air * hp(nz, 4000) * 0.4
    return y * swell(dur, peak, 1.6 if inh else 1.0, 1.2 if inh else 2.0)


def wingflap(seed=0, dur=0.16, bright=1.0, low=0.8, mid=0.0):
    """One wingbeat: a sharp feathered snap (broadband) then air sweeping down (4.5k -> 700 Hz) + a low whump."""
    nz = white(dur, seed)
    t = tt(dur)
    fc = 4500 * bright * (700 / (4500 * bright)) ** (t / dur)
    y = tv_filter(nz, fc, 1.5, "band") * np.minimum(1, t / 0.006) * np.exp(-t / (dur * 0.35))
    y += low * lp(nz, 180) * np.minimum(1, t / 0.01) * np.exp(-t / (dur * 0.3)) * 1.5
    y += 0.5 * bright * bp(nz, 2500, 6000 + 8000 * bright) * np.exp(-t / 0.008)
    if mid:
        y += mid * 2.0 * bp(nz, 250, 1100) * np.minimum(1, t / 0.008) * np.exp(-t / (dur * 0.3))
    return y


def flaps(times, seed=0, **kw):
    """helper: wingbeats at relative times -> mono array."""
    end = max(times) + 0.3
    y = np.zeros(n_(end))
    for k, t0 in enumerate(times):
        w = wingflap(seed + k, **kw) * rng(seed + 50 + k).uniform(0.7, 1.0)
        i = n_(t0) if t0 > 0 else 0
        y[i:i + len(w)] += w[:len(y) - i]
    return y


# ------------------------------------------------------------------ voices
def voice(contour, dur, seed=0, formants=((800, 1.0, 6), (1600, 0.6, 7), (2800, 0.35, 8)), nharm=24, tilt=0.8,
          noise=0.15, vib=(0.0, 0.0), rough=0.0, att=0.02, rel=0.06):
    """Harmonic vocal glide (owl calls): contour = [(t, hz), ...]; source = harmonic series with spectral tilt,
    through formant resonators, plus breath noise."""
    t = tt(dur)
    f = np.interp(t, [p[0] for p in contour], [p[1] for p in contour])
    if vib[0] > 0:
        f = f * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t))
    if rough > 0:
        f = f * (1 + rough * lp(white(dur, seed + 9), 60) * 0.5)
    src = additive(f, dur, [(k, 1.0 / k ** tilt, None) for k in range(1, nharm + 1)], seed)
    src += noise * white(dur, seed + 1)
    y = sum(a * reson(src, fr, q) for fr, a, q in formants) + 0.25 * src
    e = np.minimum(1, t / att) * np.minimum(1, (dur - t) / rel)
    return y * np.clip(e, 0, 1)


def chirp(contour, dur, seed=0, harm=((1, 1.0), (2, 0.15)), att=0.005, rel=0.03):
    """Near-pure whistle/tweet following a pitch contour."""
    t = tt(dur)
    f = np.interp(t, [p[0] for p in contour], [p[1] for p in contour])
    y = additive(f, dur, [(h, a, None) for h, a in harm], seed)
    e = np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1)
    return y * e


def birdsong(seed=0, dur=2.0, density=4.0, fmin=2600, fmax=6000):
    """Morning birds: sparse phrases of fast FM chirps (seeded)."""
    r = rng(seed)
    y = np.zeros(n_(dur))
    t = r.uniform(0, 0.2)
    while t < dur - 0.3:
        nnote = int(r.integers(2, 6))
        base = r.uniform(fmin, fmax)
        for k in range(nnote):
            d = r.uniform(0.04, 0.11)
            fa, fb = base * r.uniform(0.8, 1.25), base * r.uniform(0.7, 1.3)
            c = chirp([(0, fa), (d * 0.5, (fa + fb) / 2 * r.uniform(0.9, 1.15)), (d, fb)], d, seed + k, ((1, 1.0), (2, 0.08)), 0.004, 0.02)
            c *= np.sin(np.pi * np.linspace(0, 1, len(c))) ** 0.5
            i = n_(t)
            y[i:i + len(c)] += c[:len(y) - i] * r.uniform(0.4, 1.0)
            t += d + r.uniform(0.02, 0.06)
        t += r.exponential(1.0 / density) + 0.15
    return y


# ------------------------------------------------------------------ tonal fx
def ping(f=950.0, dur=0.35, f_start=None, partials=((1, 1.0), (3, 0.25)), decay=0.25, seed=0):
    """UI 'bloop' / soft ding: short glide into a sine with a couple of partials."""
    t = tt(dur)
    fs = f_start or f
    fr = f + (fs - f) * np.exp(-t / 0.015)
    y = additive(fr, dur, [(h, a, None) for h, a in partials], seed)
    return y * np.exp(-t / decay) * np.minimum(1, t / 0.002)


def tone(f, dur, att=0.05, rel=0.2, partials=((1, 1.0),), trem=(0, 0), seed=0):
    t = tt(dur)
    y = additive(f, dur, [(h, a, None) for h, a in partials], seed)
    e = np.minimum(1, t / max(att, 1e-4)) * np.clip((dur - t) / max(rel, 1e-4), 0, 1)
    if trem[0]:
        e = e * (1 - trem[1] * 0.5 * (1 + np.sin(2 * np.pi * trem[0] * t)))
    return y * e


def shing(seed=0, f=2750.0, dur=2.0, t60=3.0, sweep=True, ring_db=-30.0):
    """Metallic blade ring: a bright scrape transient, then inharmonic steel-bar modes ringing ~30 dB lower."""
    modes = [(f, t60, 1.0), (f * 2.76, t60 * 0.5, 0.25), (f * 5.40, t60 * 0.3, 0.12), (f * 0.51, t60 * 0.4, 0.1),
             (f * 1.004, t60, 0.6)]
    y = modal(dur, modes, None, seed) * db(ring_db)
    nz = white(0.25, seed + 1)
    s = tv_filter(nz, 1500 * (12000 / 1500) ** np.linspace(0, 1, len(nz)), 1.5, "band") * swell(0.25, 0.08, 1.0, 1.5)
    s += bp(white(0.25, seed + 2), 800, 14000) * np.exp(-tt(0.25) / 0.06)
    y[:len(s)] += s
    return y * np.minimum(1, tt(dur) / 0.003)


def snip(seed=0, pitch=1.0, dur=0.07, second=0.03):
    """Scissor snip: a short blade scrape, then the close -- a broadband click with brief, heavily damped metal modes."""
    r = rng(seed)
    t = tt(dur)
    nz = white(dur, seed)
    close = bp(nz, 1500, 14000) * np.exp(-t / 0.004)
    close += 0.35 * modal(dur, [(3100 * pitch * r.uniform(0.95, 1.05), 0.012, 1.0), (4700 * pitch * r.uniform(0.95, 1.05), 0.008, 0.7),
                               (6900 * pitch, 0.006, 0.5)], None, seed)
    close += 0.3 * reson(white(dur, seed + 4), 900 * pitch, 3) * np.exp(-t / 0.01)
    close += 0.9 * bp(white(dur, seed + 5), 250, 1200) * np.exp(-t / 0.012)          # the paper under the blades
    scrape = bp(white(second, seed + 2), 3000, 12000) * np.linspace(0.1, 0.6, n_(second)) ** 2
    y = np.zeros(n_(dur + second))
    y[:len(scrape)] += 0.4 * scrape
    i = n_(second)
    y[i:i + len(close)] += close
    return fade(y, 0.0005, 0.01)


def crackle(seed=0, dur=1.0, rate=60.0, lo=1200, hi=9000, amp_sd=0.6):
    """Paper crackle / electric crackle: Poisson micro-clicks through a band."""
    r = rng(seed)
    n = n_(dur)
    y = np.zeros(n)
    k = int(rate * dur)
    pos = np.sort(r.integers(0, max(1, n - 300), k))
    amps = np.exp(r.standard_normal(k) * amp_sd)
    g = np.exp(-np.arange(120) / 18.0)
    for p, a in zip(pos, amps):
        y[p:p + 120] += a * g * r.choice([-1, 1])
    return bp(y, lo, hi)


def tear(seed=0, dur=1.2, rate=160.0):
    """Paper tear / sticker peel: dense crackle with a rough amplitude modulation."""
    c = crackle(seed, dur, rate, 600, 7000, 0.8)
    m = np.abs(lp(white(dur, seed + 4), 30))
    m /= m.max() + 1e-9
    return c * (0.3 + m) + 0.25 * bp(white(dur, seed + 5), 800, 4000) * m


def glass(seed=0, dur=1.5, n=40, fmin=2500, fmax=11000, spread=0.4):
    """Glassy shatter: many short inharmonic pings scattered in time."""
    r = rng(seed)
    y = np.zeros(n_(dur))
    for k in range(n):
        t0 = abs(r.exponential(spread * 0.3)) if k > 3 else 0.0
        f = r.uniform(fmin, fmax)
        d = r.uniform(0.05, 0.3)
        p = modal(d, [(f, d, 1.0), (f * r.uniform(1.4, 2.7), d * 0.5, 0.5)], None, seed + k)
        i = n_(min(t0, dur - 0.05))
        y[i:i + len(p)] += p[:len(y) - i] * r.uniform(0.2, 1.0) * np.exp(-t0 / (spread + 1e-3))
    y += 0.5 * hp(white(dur, seed + 99), 3000) * np.exp(-tt(dur) / 0.05)
    return y


def bell(f, dur=3.0, seed=0, bright=1.0, t60=2.5):
    """Small bell / celesta: inharmonic partials (hum, prime, tierce, quint, nominal...)."""
    parts = [(0.5, 0.35, t60 * 1.2), (1.0, 1.0, t60), (1.19, 0.25 * bright, t60 * 0.6), (1.5, 0.3 * bright, t60 * 0.6),
             (2.0, 0.45 * bright, t60 * 0.5), (2.51, 0.2 * bright, t60 * 0.35), (3.0, 0.15 * bright, t60 * 0.3),
             (4.07, 0.08 * bright, t60 * 0.2)]
    y = modal(dur, [(f * r, T, a) for r, a, T in parts], None, seed)
    return y * np.minimum(1, tt(dur) / 0.002)


def riser(seed=0, dur=1.0, f0=200.0, f1=3000.0, noise=0.8):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur) ** 2
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    nz = white(dur, seed)
    y = y * 0.5 + noise * tv_filter(nz, np.clip(f * 2, 100, 16000), 2.0, "band")
    return y * (t / dur) ** 2.5


def whine(f, dur, seed=0, wobble=0.002, partials=((1, 1.0), (2, 0.05))):
    """Electric whine / high ring: steady tone with a slight wobble."""
    t = tt(dur)
    fr = f * (1 + wobble * np.sin(2 * np.pi * 5.3 * t) + wobble * 0.5 * lp(white(dur, seed), 8) * 10)
    return additive(fr, dur, [(h, a, None) for h, a in partials], seed)
