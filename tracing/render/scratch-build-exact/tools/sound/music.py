"""Instruments for the score: felt piano, warm pad, sub bass, drone, glass keys -- additive/modal synthesis only."""
import numpy as np
from dsp import SR, rng, n_, tt, db, white, brown, lp, hp, bp, additive, modal, swell, fade, nhz, midi_hz, note_midi


def piano(f, dur=3.0, vel=0.7, seed=0, bright=1.0, felt=0.5, B=0.0004, release=None, punch=0.0, sus=1.0):
    """Soft (felt) piano note: stiff-string partials f_k = k f sqrt(1 + B k^2), per-partial decay, two slightly detuned
    strings (beating), hammer thump. `release` (s) damps the note (key up)."""
    t = tt(dur)
    r = rng(seed)
    y = np.zeros(len(t))
    nh = int(min(28, (SR * 0.45) // f))
    for k in range(1, nh + 1):
        fk = k * f * np.sqrt(1 + B * k * k)
        amp = (1.0 / k ** (0.6 + felt * 0.6)) * (0.8 + 0.18 * vel * bright) ** (k - 1)
        dec = 2.5 * (220 / f) ** 0.35 * (1.0 / (1 + 0.22 * (k - 1) + 0.00035 * max(0.0, fk - 600))) * (1.2 - 0.4 * vel)
        dec = max(0.08, dec)
        det = 1 + r.uniform(0.0002, 0.0008)
        ph = r.uniform(0, 2 * np.pi)
        e = 0.7 * np.exp(-t / (dec * sus)) + 0.3 * np.exp(-t / (dec * 4 * sus))
        if punch:
            e = e + punch * 2.0 * np.exp(-t / 0.09)
        y += amp * e * (np.sin(2 * np.pi * fk * t + ph) + 0.8 * np.sin(2 * np.pi * fk * det * t + ph * 1.3))
    h = lp(white(0.03, seed + 1), 1200 + 2000 * vel) * np.exp(-np.arange(n_(0.03)) / (0.006 * SR))
    y[:len(h)] += 0.25 * felt * h
    y *= np.minimum(1, t / (0.002 + 0.006 * felt))
    if release is not None and release < dur:
        i = n_(release)
        y[i:] *= np.exp(-(t[i:] - release) / 0.12)
    return fade(y, 0.0, 0.05)


def pad(freqs, dur, att=1.5, rel=2.0, bright=1800.0, voices=3, detune=0.006, seed=0, amps=None):
    """Warm pad: detuned band-limited saws per note, lowpassed, slow attack/release."""
    t = tt(dur)
    r = rng(seed)
    y = np.zeros(len(t))
    amps = amps or [1.0] * len(freqs)
    for f, a in zip(freqs, amps):
        nh = int(min(24, (SR * 0.4) // f))
        for v in range(voices):
            dv = 1 + detune * (v - (voices - 1) / 2) + r.uniform(-0.001, 0.001)
            y += a * additive(f * dv, dur, [(k, 1.0 / k, None) for k in range(1, nh + 1)], seed + v * 13 + int(f))
    y = lp(y, bright, 2)
    e = np.minimum(1, t / max(att, 1e-3)) * np.clip((dur - t) / max(rel, 1e-3), 0, 1)
    return y * e ** 1.5


def strings(freqs, dur, att=0.8, rel=1.5, bright=2500.0, seed=0, vib=5.0, nharm=20):
    """Soft string section: saw stacks with slow vibrato, bowed attack."""
    t = tt(dur)
    y = np.zeros(len(t))
    r = rng(seed)
    for i, f in enumerate(freqs):
        for v in range(4):
            fv = f * (1 + 0.004 * (v - 1.5)) * (1 + 0.003 * np.sin(2 * np.pi * (vib + r.uniform(-0.5, 0.5)) * t + r.uniform(0, 6)))
            nh = int(min(nharm, (SR * 0.4) // f))
            y += additive(fv, dur, [(k, 1.0 / k ** 1.5, None) for k in range(1, nh + 1)], seed + i * 7 + v)
    y = lp(y, bright)
    e = np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1)
    return y * e


def sub(f, dur, att=0.05, rel=0.6, drive=0.0):
    t = tt(dur)
    y = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t)
    if drive:
        y = np.tanh(y * (1 + drive)) / np.tanh(1 + drive)
    e = np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1)
    return y * e


def drone(notes, dur, seed=0, am_rate=0.08, am_depth=0.3, tri=True):
    """Dark tonal drone: notes = [(hz, level_db)], soft triangle-ish tones with slow independent amplitude drift."""
    t = tt(dur)
    y = np.zeros(len(t))
    r = rng(seed)
    for i, (f, lvl) in enumerate(notes):
        parts = [(1, 1.0, None), (3, 1 / 9, None), (5, 1 / 25, None)] if tri else [(1, 1.0, None)]
        tone = additive(f * (1 + r.uniform(-0.001, 0.001)), dur, parts, seed + i)
        am = 1 - am_depth * 0.5 * (1 + np.sin(2 * np.pi * am_rate * r.uniform(0.6, 1.6) * t + r.uniform(0, 6)))
        y += db(lvl) * tone * am
    return y


def celesta(f, dur=2.0, seed=0, vel=0.7):
    """Glass/celesta key: sine-ish fundamental + 4th partial, bright attack, medium decay."""
    t = tt(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9) + 0.35 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.15)
    y += 0.1 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.5)
    return y * np.minimum(1, t / 0.001) * vel


def chord_hz(names, cents=0.0):
    return [nhz(n, cents) for n in names]
