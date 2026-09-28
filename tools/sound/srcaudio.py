"""The source film's audio for the analysis tools (verify.py, calibrate.py): snapshots/audio-work/src.wav.
Extracted once from the film named by $APPRENTICE_SOURCE (or $REF). Analysis only: nothing from it enters the score."""
import os
import subprocess
import sys


def source_wav(root):
    p = os.path.join(root, "snapshots", "audio-work", "src.wav")
    if os.path.exists(p):
        return p
    film = os.environ.get("REF") or os.environ.get("APPRENTICE_SOURCE")
    if not film or not os.path.isfile(film):
        sys.exit("needs the original film's audio: set APPRENTICE_SOURCE=/path/to/original.mp4 "
                 "(it is extracted once to snapshots/audio-work/src.wav)")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", film, "-vn", "-acodec", "pcm_f32le", "-ar", "48000", p],
                   check=True)
    return p
