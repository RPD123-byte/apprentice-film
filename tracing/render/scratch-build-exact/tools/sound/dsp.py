"""DSP primitives for the score. Everything is synthesized from seeded noise and oscillators -- no samples.
All functions are deterministic: randomness only through rng(seed)."""
import numpy as np
import scipy.signal as ss
from numba import njit

SR = 48000


def rng(seed):
    return np.random.default_rng(int(seed) & 0xFFFFFFFF)


def n_(d):
    return max(1, int(round(d * SR)))


def tt(d):
    return np.arange(n_(d)) / SR


def db(x):
    return 10.0 ** (x / 20.0)


# ---------------------------------------------------------------- noise
def white(d, seed):
    return rng(seed).standard_normal(n_(d))


def pink(d, seed):
    """Voss-McCartney-ish pink via FFT shaping (1/f power)."""
    n = n_(d)
    X = np.fft.rfft(rng(seed).standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1]
    X /= np.sqrt(f / 20.0)
    y = np.fft.irfft(X, n)
    return y / (np.std(y) + 1e-12)


def brown(d, seed):
    n = n_(d)
    X = np.fft.rfft(rng(seed).standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1]
    X /= (f / 20.0)
    y = np.fft.irfft(X, n)
    y = hp(y, 15)
    return y / (np.std(y) + 1e-12)


def shaped_noise(d, seed, pts):
    """Noise with a static spectral shape: pts = [(freq_hz, gain_db), ...] (log-freq interpolation)."""
    n = n_(d)
    X = np.fft.rfft(rng(seed).standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    lf = np.log(np.maximum(f, 1.0))
    px = np.log([p[0] for p in pts])
    py = np.array([p[1] for p in pts], float)
    g = db(np.interp(lf, px, py))
    y = np.fft.irfft(X * g, n)
    return y


# ---------------------------------------------------------------- filters
def _sos(kind, f, order=2):
    nyq = SR / 2
    if kind == "band":
        lo, hi = f
        lo = max(5.0, min(lo, nyq * 0.95))
        hi = max(lo * 1.01, min(hi, nyq * 0.98))
        return ss.butter(order, [lo, hi], "band", fs=SR, output="sos")
    f = max(5.0, min(f, nyq * 0.98))
    return ss.butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, order=2):
    return ss.sosfilt(_sos("low", f, order), x, axis=0)


def hp(x, f, order=2):
    return ss.sosfilt(_sos("high", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return ss.sosfilt(_sos("band", (lo, hi), order), x, axis=0)


def peak_eq(x, f0, gain_db, q=1.0):
    """RBJ peaking EQ."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    return ss.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def reson(x, f0, q):
    """Two-pole resonator (bandpass, unity peak)."""
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b = [alpha, 0, -alpha]
    a = [1 + alpha, -2 * np.cos(w0), 1 - alpha]
    return ss.lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


@njit(cache=True)
def _svf(x, fc, q, sr, mode):
    y = np.zeros_like(x)
    lo = 0.0
    bpv = 0.0
    damp = 1.0 / q
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], sr / 6) / sr)
        hi = x[i] - lo - damp * bpv
        bpv += f * hi
        lo += f * bpv
        if mode == 0:
            y[i] = bpv
        elif mode == 1:
            y[i] = lo
        else:
            y[i] = hi
    return y


def tv_filter(x, fc, q=2.0, mode="band"):
    """Time-varying state-variable filter (per-sample cutoff array fc). mode: band | low | high."""
    fc = np.ascontiguousarray(np.broadcast_to(np.asarray(fc, float), x.shape))
    return _svf(np.ascontiguousarray(x, dtype=np.float64), fc, float(q), float(SR), {"band": 0, "low": 1, "high": 2}[mode])


def sweep_filter(x, f_start, f_end, kind="band", width=1.0, nseg=24):
    """Piecewise-constant filter sweep (cheap): split x into nseg chunks with overlap-add, filter each with its own
    centre frequency (geometric interpolation). width = bandwidth in octaves for 'band'."""
    n = len(x)
    out = np.zeros(n)
    hop = max(1, n // nseg)
    win_len = 2 * hop
    w = np.hanning(win_len + 1)[:-1]
    for k in range(-1, nseg + 1):
        a = k * hop
        seg = np.zeros(win_len)
        lo_i, hi_i = max(0, a), min(n, a + win_len)
        if hi_i <= lo_i:
            continue
        seg[lo_i - a:hi_i - a] = x[lo_i:hi_i]
        u = np.clip((a + hop) / n, 0, 1)
        fc = f_start * (f_end / f_start) ** u
        if kind == "band":
            y = bp(np.concatenate([np.zeros(512), seg]), fc * 2 ** (-width / 2), fc * 2 ** (width / 2))[512:]
        elif kind == "low":
            y = lp(np.concatenate([np.zeros(512), seg]), fc)[512:]
        else:
            y = hp(np.concatenate([np.zeros(512), seg]), fc)[512:]
        y = y * w
        out[lo_i:hi_i] += y[lo_i - a:hi_i - a]
    return out


# ---------------------------------------------------------------- envelopes
def env_ad(d, a, dec, curve=1.0):
    """attack a (s) linear, then exponential decay with time constant dec (s)."""
    t = tt(d)
    e = np.where(t < a, t / max(a, 1e-6), np.exp(-(t - a) / max(dec, 1e-6)))
    return e ** curve


def env_pts(d, pts, db_mode=False):
    """piecewise-linear envelope from [(t, value), ...]; db_mode interpolates dB values (None = silence)."""
    t = tt(d)
    xs = [p[0] for p in pts]
    if db_mode:
        ys = [-120.0 if p[1] is None else p[1] for p in pts]
        return db(np.interp(t, xs, ys))
    ys = [p[1] for p in pts]
    return np.interp(t, xs, ys)


def swell(d, peak=0.5, p1=2.0, p2=2.0):
    """smooth rise/fall bump peaking at fraction `peak` of d."""
    u = np.linspace(0, 1, n_(d))
    e = np.where(u < peak, (u / peak) ** p1, ((1 - u) / (1 - peak)) ** p2)
    return np.clip(e, 0, 1)


def fade(x, fi=0.003, fo=0.01):
    x = x.copy()
    a, b = n_(fi), n_(fo)
    if len(x) > a + b:
        x[:a] *= np.linspace(0, 1, a)
        x[-b:] *= np.linspace(1, 0, b)
    return x


# ---------------------------------------------------------------- oscillators
def phase(freq, d=None):
    f = np.asarray(freq, float)
    if f.ndim == 0:
        f = np.full(n_(d), float(f))
    return 2 * np.pi * np.cumsum(f) / SR


def sine(freq, d=None, ph0=0.0):
    return np.sin(phase(freq, d) + ph0)


def additive(freq, d, partials, ph_seed=0):
    """partials: [(ratio, amp, decay_s or None)]; freq scalar or array (contour)."""
    f = np.asarray(freq, float)
    n = n_(d) if f.ndim == 0 else len(f)
    if f.ndim == 0:
        f = np.full(n, float(f))
    t = np.arange(n) / SR
    base = 2 * np.pi * np.cumsum(f) / SR
    r = rng(ph_seed)
    y = np.zeros(n)
    for ratio, amp, dec in partials:
        if np.max(f) * ratio > SR * 0.45:
            continue
        p = np.sin(base * ratio + r.uniform(0, 2 * np.pi))
        if dec:
            p *= np.exp(-t / dec)
        y += amp * p
    return y


def saw_bl(freq, d, nh=None, seed=0):
    """band-limited saw by additive synthesis (for pads; freq scalar)."""
    nh = nh or int(min(40, (SR * 0.45) // max(freq, 20)))
    return additive(freq, d, [(k, 1.0 / k, None) for k in range(1, nh + 1)], seed)


def modal(d, modes, exc=None, seed=0):
    """Modal resonator bank: modes = [(freq, t60_s, amp)], excited by an impulse (or exc signal, convolved)."""
    t = tt(d)
    r = rng(seed)
    y = np.zeros(len(t))
    for f, t60, a in modes:
        if f >= SR * 0.47:
            continue
        y += a * np.sin(2 * np.pi * f * t + r.uniform(0, 0.3)) * np.exp(-6.91 * t / max(t60, 1e-4))
    if exc is not None:
        y = ss.fftconvolve(y, exc)[:len(t)]
    return y


@njit(cache=True)
def _ks(buf, n, damp):
    L = len(buf)
    out = np.zeros(n)
    idx = 0
    prev = 0.0
    for i in range(n):
        v = buf[idx]
        nv = damp * 0.5 * (v + prev)
        prev = v
        buf[idx] = nv
        out[i] = v
        idx = (idx + 1) % L
    return out


def karplus(f0, d, seed=0, damp=0.996, bright=0.5):
    L = max(2, int(round(SR / f0)))
    buf = rng(seed).uniform(-1, 1, L)
    buf = lp(buf, 1000 + 9000 * bright)
    return _ks(np.ascontiguousarray(buf), n_(d), float(damp))


def fm(fc, fm_, index, d, idx_env=None):
    t = tt(d)
    I = index * (idx_env if idx_env is not None else 1.0)
    return np.sin(2 * np.pi * fc * t + I * np.sin(2 * np.pi * fm_ * t))


# ---------------------------------------------------------------- space
def pan_st(x, pan=0.0, width=0.0):
    """equal-power pan, pan in [-1, 1] (-1 = left)."""
    th = (pan + 1) * np.pi / 4
    if x.ndim == 2:
        return np.stack([x[:, 0] * np.cos(th) * np.sqrt(2), x[:, 1] * np.sin(th) * np.sqrt(2)], 1)
    return np.stack([x * np.cos(th), x * np.sin(th)], 1) * np.sqrt(2)


def make_ir(t60=1.2, seed=1, lp_hz=6000, hp_hz=120, pre=0.012, er=True, dens=1.0):
    """Synthetic stereo room impulse response: early reflections + exponentially decaying filtered noise tail."""
    L = n_(t60 * 1.3 + pre + 0.05)
    t = np.arange(L) / SR
    r = rng(seed)
    ir = np.zeros((L, 2))
    tail = r.standard_normal((L, 2)) * np.exp(-6.91 * t / t60)[:, None]
    # darker as it decays: blend a lowpassed copy in over time
    dark = lp(tail, lp_hz * 0.35)
    mix = np.clip(t / (t60 * 0.6), 0, 1)[:, None]
    tail = tail * (1 - mix) + dark * mix * 1.6
    tail = lp(hp(tail, hp_hz), lp_hz)
    p = n_(pre)
    tail[:p] = 0
    ramp = n_(0.02)
    tail[p:p + ramp] *= np.linspace(0, 1, ramp)[:, None]
    ir += tail * dens
    if er:
        for k in range(10):
            dt = pre * (0.4 + 0.35 * k) + r.uniform(0, 0.004)
            i = n_(dt)
            if i < L:
                ir[i, k % 2] += r.uniform(0.3, 0.8) * (0.8 ** k) * 6
    ir /= np.sqrt((ir ** 2).sum() / 2)
    return ir


def convolve_st(x, ir):
    """x: (n,2) or (n,), ir: (L,2) -> (n+L-1, 2)."""
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    return np.stack([ss.fftconvolve(x[:, c], ir[:, c]) for c in (0, 1)], 1)


def soft_clip(x, th=0.9):
    y = x.copy()
    k = np.abs(y) > th
    y[k] = np.sign(y[k]) * (th + (1 - th) * np.tanh((np.abs(y[k]) - th) / (1 - th)))
    return y


def rms_db(x):
    return 10 * np.log10(np.mean(np.asarray(x) ** 2) + 1e-20)


def peak_db(x, win=0.02):
    x = np.asarray(x)
    if x.ndim == 2:
        x = x.mean(1)
    w = n_(win)
    if len(x) <= w:
        return rms_db(x)
    c = np.convolve(x ** 2, np.ones(w) / w, "valid")
    return 10 * np.log10(c.max() + 1e-20)


def midi_hz(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8,
        "A": 9, "A#": 10, "Bb": 10, "B": 11}


def note_midi(s):
    s = s.strip()
    name = s[:2] if len(s) > 2 and s[1] in "#b" else s[:1]
    octv = int(s[len(name):])
    return 12 * (octv + 1) + NOTE[name]


def nhz(s, cents=0.0):
    return float(midi_hz(note_midi(s) + cents / 100.0))
