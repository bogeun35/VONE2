"""Render an original, deterministic cooperative-game loop without external assets.

Python standard library only. No device is opened and no sound is played.
All note tails wrap into the start of the period, preserving a continuous loop.
"""
from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import wave

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "play" / "audio" / "park-together.wav"
RATE = 22050
BPM = 96
BEAT = 60 / BPM
BARS = 16
DURATION = BARS * 4 * BEAT
COUNT = round(RATE * DURATION)
left = array("d", [0.0]) * COUNT
right = array("d", [0.0]) * COUNT
TAU = 2 * math.pi
rng = random.Random(20261009)
events = {"pluck": 0, "bell": 0, "pad": 0, "bass": 0, "kick": 0, "brush": 0, "hat": 0}


def pitch(note):
    return 440 * 2 ** ((note - 69) / 12)


def add(kind, beat, note=60, length=1, gain=0.1, pan=0):
    """Synthesize a note into the circular stereo timeline."""
    events[kind] += 1
    frequency = pitch(note)
    seconds = length * BEAT
    start = round(beat * BEAT * RATE)
    samples = round(seconds * RATE)
    gl = math.sqrt((1 - pan) / 2) * gain
    gr = math.sqrt((1 + pan) / 2) * gain
    noise_last = 0.0
    for i in range(samples):
        t = i / RATE
        u = t / seconds
        phase = TAU * frequency * t
        attack = min(1, t / 0.008)
        release = min(1, (seconds - t) / 0.055)
        if kind == "pluck":
            # Rounded wooden/nylon voice, with a small bright transient.
            env = attack * release * math.exp(-4.3 * u)
            sound = (math.sin(phase) + 0.29 * math.sin(2 * phase)
                     + 0.12 * math.sin(3 * phase) + 0.045 * math.sin(5 * phase)) * env
        elif kind == "bell":
            env = attack * release * math.exp(-4.5 * u)
            sound = (math.sin(phase) + 0.23 * math.sin(2.003 * phase)
                     + 0.09 * math.sin(3.98 * phase)) * env
        elif kind == "pad":
            env = min(1, t / 0.15) * min(1, (seconds - t) / 0.34)
            sound = (math.sin(phase) + 0.19 * math.sin(2 * phase)
                     + 0.09 * math.sin(3 * phase)) * env
            sound *= 0.94 + 0.06 * math.sin(TAU * 0.8 * t)
        elif kind == "bass":
            env = min(1, t / 0.015) * release * math.exp(-2.6 * u)
            sound = (math.sin(phase) + 0.2 * math.sin(2 * phase)) * env
        elif kind == "kick":
            # Integrated falling frequency gives a soft acoustic-style thump.
            phase = TAU * (49 * t + 75 * 0.018 * (1 - math.exp(-t / 0.018)))
            sound = math.sin(phase) * attack * release * math.exp(-t * 21)
        elif kind == "brush":
            noise = rng.uniform(-1, 1)
            noise_last = 0.6 * noise_last + 0.4 * noise
            sound = (0.8 * noise_last + 0.2 * math.sin(TAU * 185 * t))
            sound *= attack * release * math.exp(-t * 32)
        else:
            noise = rng.uniform(-1, 1)
            high = noise - noise_last
            noise_last = noise
            sound = high * attack * release * math.exp(-t * 65) * 0.35
        idx = (start + i) % COUNT
        left[idx] += sound * gl
        right[idx] += sound * gr


# D major: I - IV - vi - V; second half visits ii and a suspended dominant.
# Each chord has an added sixth/ninth for a light and welcoming color.
chords = [
    (38, [62, 66, 69, 76]), (43, [62, 67, 71, 76]),
    (47, [62, 66, 71, 73]), (45, [61, 64, 69, 74]),
    (38, [62, 66, 69, 76]), (43, [62, 67, 71, 76]),
    (40, [62, 64, 67, 71]), (45, [61, 64, 69, 73]),
    (47, [62, 66, 71, 73]), (43, [62, 67, 71, 76]),
    (38, [62, 66, 69, 76]), (45, [61, 64, 69, 74]),
    (40, [62, 64, 67, 71]), (43, [62, 67, 71, 76]),
    (45, [62, 64, 69, 74]), (45, [61, 64, 69, 73]),
]

# Original call-and-response motif; rests leave room for gameplay sounds.
# Notes are (offset in beats, MIDI pitch, sounding length in beats).
melody = [
    [(0, 74, .75), (1, 78, .5), (1.75, 81, .7), (3, 78, .6)],
    [(.5, 79, .55), (1.5, 78, .55), (2.5, 76, 1.1)],
    [(0, 78, .65), (1, 81, .55), (2, 83, .8), (3.25, 81, .5)],
    [(0, 76, .7), (1, 73, .65), (2.5, 76, 1)],
    [(0, 74, .55), (.75, 78, .55), (1.5, 81, .55), (2.5, 86, 1)],
    [(.5, 83, .65), (1.5, 81, .65), (2.75, 79, .9)],
    [(0, 78, .55), (1, 76, .55), (2, 74, .55), (3, 71, .6)],
    [(.5, 73, .65), (1.5, 76, .55), (2.5, 81, 1)],
    [(0, 83, .8), (1.25, 81, .5), (2, 78, .6), (3, 81, .6)],
    [(0, 79, .75), (1.5, 83, .6), (2.5, 86, .95)],
    [(.5, 81, .55), (1.5, 78, .55), (2.5, 74, 1)],
    [(0, 76, .6), (1, 78, .55), (2, 81, .8), (3.25, 78, .5)],
    [(0, 79, .55), (.75, 78, .55), (1.5, 76, .55), (2.5, 74, 1)],
    [(.5, 71, .65), (1.5, 74, .55), (2.5, 79, .9)],
    [(0, 78, .65), (1, 76, .65), (2.5, 74, 1)],
    [(0, 73, .7), (1.5, 76, .7), (3, 73, .7)],
]

for bar, (root, chord) in enumerate(chords):
    base = bar * 4
    for k, note in enumerate(chord):
        add("pad", base, note - 12, 4.35, .025, (k - 1.5) * .24)
    for offset, note, length in melody[bar]:
        add("pluck", base + offset, note, length + .22, .095, -.13)
        # Small room reflection without a long, muddy reverb tail.
        add("pluck", base + offset + .19, note, length + .16, .013, .38)
    for j, offset in enumerate([.5, 1.5, 2.5, 3.5]):
        note = chord[(j + bar % 2) % 4]
        add("bell", base + offset, note + 12, .65, .021 if bar < 8 else .028, .42)
    for offset, note, strength in [(0, root, 1), (1.5, root + 7, .72), (2, root, .9), (3.5, root + 12, .58)]:
        add("bass", base + offset, note, .7, .092 * strength, 0)
    for offset in [0, 2]:
        add("kick", base + offset, length=.35, gain=.069)
    for offset in [1, 3]:
        add("brush", base + offset, length=.25, gain=.047, pan=-.2)
    for j in range(8):
        add("hat", base + j * .5, length=.13, gain=.023 if j % 2 == 0 else .016, pan=.27)
    if bar in [3, 7, 11, 15]:
        add("brush", base + 3.5, length=.18, gain=.025, pan=.2)

# Soft saturation followed by a fixed quiet peak ceiling. No clipped samples.
for channel in (left, right):
    for i, sample in enumerate(channel):
        channel[i] = math.tanh(sample * 1.15)
peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
scale = .42 / peak
pcm = bytearray(COUNT * 4)
energy = 0
peak_pcm = 0
for i, (lval, rval) in enumerate(zip(left, right)):
    lval, rval = round(lval * scale * 32767), round(rval * scale * 32767)
    struct.pack_into("<hh", pcm, i * 4, lval, rval)
    energy += lval * lval + rval * rval
    peak_pcm = max(peak_pcm, abs(lval), abs(rval))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUTPUT), "wb") as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(RATE)
    wav.writeframes(pcm)

first = struct.unpack_from("<hh", pcm, 0)
last = struct.unpack_from("<hh", pcm, len(pcm) - 4)
seam = max(abs(a - b) / 32767 for a, b in zip(first, last))
rms = math.sqrt(energy / (COUNT * 2)) / 32767
assert peak_pcm < 32767
assert seam < .012, f"Loop boundary too steep: {seam}"
assert OUTPUT.stat().st_size < 8_000_000
info = {
    "title": "Together at Tuna Park", "title_ko": "참치파크, 함께 한 걸음",
    "file": "audio/park-together.wav", "original": True,
    "source": "Original composed note sequences and procedural instrument synthesis; no samples or borrowed audio.",
    "composer": "Codex for this project", "bpm": BPM, "key": "D major",
    "meter": "4/4", "bars": BARS, "duration_seconds": DURATION,
    "sample_rate": RATE, "channels": 2, "bits_per_sample": 16,
    "arrangement": "Warm wooden pluck lead with call-and-response phrases, soft organ pad, bell counterline, rounded bass, quiet kick/brush/shaker rhythm; second-half variation and dominant return.",
    "loop": "Exact 16-bar circular timeline; instrument tails wrap into opening; no fade-to-silence gap.",
    "suggested_browser_volume": .28,
    "verification": {
        "audio_played": False, "method": "PCM statistics and WAV header inspection only; no listening validation",
        "frames": COUNT, "bytes": OUTPUT.stat().st_size,
        "peak_amplitude": round(peak_pcm / 32767, 6),
        "peak_dbfs": round(20 * math.log10(peak_pcm / 32767), 2),
        "rms_amplitude": round(rms, 6), "rms_dbfs": round(20 * math.log10(rms), 2),
        "clipped_samples": 0, "loop_boundary_max_step": round(seam, 6),
        "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
    }, "synthesized_events": events,
}
(ROOT / "music-info.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(info, ensure_ascii=False, indent=2))
