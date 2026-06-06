#!/usr/bin/env python3
"""
Retro Pixel Game Sound Effect Generator
Generates 26 8-bit/16-bit style game sound effects using pure Python.
No external dependencies required.
"""

import wave
import struct
import math
import random
import os

SAMPLE_RATE = 22050
OUTPUT_DIR = r"C:\Users\LEGION Y7000P\Desktop\sound"

def sine_wave(freq, t, sample_rate=SAMPLE_RATE):
    """Generate sine wave at given frequency for time array t"""
    return math.sin(2 * math.pi * freq * t)

def square_wave(freq, t, duty=0.5, sample_rate=SAMPLE_RATE):
    """Generate square wave (8-bit feel)"""
    phase = (freq * t) % 1.0
    return 1.0 if phase < duty else -1.0

def triangle_wave(freq, t, sample_rate=SAMPLE_RATE):
    """Generate triangle wave"""
    phase = (freq * t) % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0

def sawtooth_wave(freq, t, sample_rate=SAMPLE_RATE):
    """Generate sawtooth wave"""
    phase = (freq * t) % 1.0
    return 2.0 * phase - 1.0

def noise(samples):
    """Generate white noise"""
    return [random.uniform(-1, 1) for _ in range(samples)]

def apply_envelope(samples, attack, decay, sustain_level, release, sample_rate=SAMPLE_RATE):
    """Apply ADSR envelope to samples"""
    total = len(samples)
    attack_samples = int(attack * sample_rate)
    decay_samples = int(decay * sample_rate)
    release_samples = int(release * sample_rate)
    sustain_samples = max(0, total - attack_samples - decay_samples - release_samples)

    envelope = []
    for i in range(total):
        if i < attack_samples:
            envelope.append(i / attack_samples)
        elif i < attack_samples + decay_samples:
            progress = (i - attack_samples) / decay_samples
            envelope.append(1.0 - (1.0 - sustain_level) * progress)
        elif i < total - release_samples:
            envelope.append(sustain_level)
        else:
            progress = (i - (total - release_samples)) / release_samples
            envelope.append(sustain_level * (1.0 - progress))

    return [s * e for s, e in zip(samples, envelope)]

def make_time_array(duration, sample_rate=SAMPLE_RATE):
    """Create time array for given duration"""
    samples = int(duration * sample_rate)
    return [i / sample_rate for i in range(samples)]

def linear_sweep(start_freq, end_freq, duration, wave_func=square_wave, sample_rate=SAMPLE_RATE):
    """Frequency sweep from start_freq to end_freq"""
    samples = int(duration * sample_rate)
    result = []
    for i in range(samples):
        t = i / sample_rate
        # Instantaneous frequency
        progress = i / samples
        freq = start_freq + (end_freq - start_freq) * progress
        # Accumulated phase
        phase = (start_freq + (end_freq - start_freq) * progress / 2) * t
        if wave_func == square_wave:
            duty = 0.5
            val = 1.0 if (phase % 1.0) < duty else -1.0
        elif wave_func == sine_wave:
            val = math.sin(2 * math.pi * phase)
        elif wave_func == triangle_wave:
            p = phase % 1.0
            val = 4.0 * abs(p - 0.5) - 1.0
        elif wave_func == sawtooth_wave:
            val = 2.0 * (phase % 1.0) - 1.0
        else:
            val = wave_func(freq, t)
        result.append(val)
    return result

def exp_sweep(start_freq, end_freq, duration, wave_func=square_wave, sample_rate=SAMPLE_RATE):
    """Exponential frequency sweep"""
    samples = int(duration * sample_rate)
    result = []
    for i in range(samples):
        t = i / sample_rate
        progress = i / max(samples - 1, 1)
        if start_freq > 0 and end_freq > 0:
            freq = start_freq * (end_freq / start_freq) ** progress
        else:
            freq = start_freq + (end_freq - start_freq) * progress
        phase = freq * t  # approximate
        if wave_func == square_wave:
            val = 1.0 if (phase % 1.0) < 0.5 else -1.0
        elif wave_func == sine_wave:
            val = math.sin(2 * math.pi * phase)
        elif wave_func == triangle_wave:
            p = phase % 1.0
            val = 4.0 * abs(p - 0.5) - 1.0
        else:
            val = math.sin(2 * math.pi * phase)
        result.append(val)
    return result

def mix(*tracks, levels=None):
    """Mix multiple audio tracks together"""
    if not tracks:
        return []
    max_len = max(len(t) for t in tracks)
    if levels is None:
        levels = [1.0] * len(tracks)
    result = [0.0] * max_len
    for track, level in zip(tracks, levels):
        for i, sample in enumerate(track):
            result[i] += sample * level
    # Normalize
    max_val = max(abs(s) for s in result) if result else 1.0
    if max_val > 1.0:
        result = [s / max_val for s in result]
    return result

def save_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Save samples as WAV file"""
    filepath = os.path.join(OUTPUT_DIR, filename)
    max_val = max(abs(s) for s in samples) if samples else 1.0
    if max_val > 1.0:
        samples = [s / max_val for s in samples]

    with wave.open(filepath, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in samples:
            # Clamp to 16-bit range
            val = int(max(-32768, min(32767, s * 32767)))
            wf.writeframes(struct.pack('<h', val))
    return filepath

def to_16bit(samples):
    """Convert float samples to 16-bit integers"""
    return [int(max(-32768, min(32767, s * 32767))) for s in samples]


# ============================================================
# CLASS 3: 基础行动类 (Basic Actions)
# ============================================================

def generate_01_wait():
    """等待 - Defensive stance, low short, prepared feeling, 0.25s"""
    dur = 0.25
    t = make_time_array(dur)
    # Low frequency square wave with slight tension
    base = [square_wave(80, ti) * 0.5 for ti in t]
    # Add subtle higher harmonic for tension
    harm = [square_wave(160, ti) * 0.15 for ti in t]
    samples = mix(base, harm)
    samples = apply_envelope(samples, attack=0.02, decay=0.05, sustain_level=0.7, release=0.08)
    return save_wav("wait_defensive_0.25s.wav", samples)

def generate_02_look_back():
    """看后面 - Quick turn, light swish, 0.25s"""
    dur = 0.25
    # Whoosh sound: noise with bandpass-like frequency sweep
    samples = int(dur * SAMPLE_RATE)
    result = []
    for i in range(samples):
        t = i / SAMPLE_RATE
        progress = i / samples
        # Sweep from high to mid frequency, quick
        freq = 1200 - 800 * progress
        # Mix noise with tonal sweep for swish
        tone = math.sin(2 * math.pi * freq * t) * 0.5
        noise_val = random.uniform(-0.3, 0.3)
        val = tone + noise_val * (1.0 - abs(progress - 0.5) * 2)
        result.append(val)
    result = apply_envelope(result, attack=0.01, decay=0.1, sustain_level=0.3, release=0.1)
    return save_wav("look_back_swish_0.25s.wav", result)

def generate_03_punch_swing():
    """打一拳出手 - 8-bit punch swing, fast powerful, 0.2s"""
    dur = 0.2
    # Quick downward frequency sweep - punch wind-up and swing
    sweep = linear_sweep(400, 100, dur, wave_func=square_wave)
    sweep = apply_envelope(sweep, attack=0.01, decay=0.05, sustain_level=0.5, release=0.05)
    # Add some noise for impact texture
    n = noise(int(dur * SAMPLE_RATE))
    n = apply_envelope(n, attack=0.02, decay=0.05, sustain_level=0.3, release=0.1)
    samples = mix(sweep, n, levels=[0.8, 0.2])
    return save_wav("punch_swing_0.2s.wav", samples)

def generate_04_punch_hit():
    """打一拳命中 - Comedic heavy elastic punch hit, not bloody, 0.25s"""
    dur = 0.25
    t = make_time_array(dur)
    # Low thud with quick decay - square wave at low frequency
    impact = [square_wave(60, ti) * 0.8 for ti in t[:int(0.08 * SAMPLE_RATE)]]
    # Elastic bounce resonance
    resonance = []
    for i in range(int(dur * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        # Decaying resonance frequency
        freq = 120 * math.exp(-i / (SAMPLE_RATE * 0.05)) + 40
        resonance.append(math.sin(2 * math.pi * freq * ti) * 0.2)
    # Pad impact to full length
    impact_padded = impact + [0.0] * (int(dur * SAMPLE_RATE) - len(impact))
    samples = mix(impact_padded, resonance)
    samples = apply_envelope(samples, attack=0.001, decay=0.06, sustain_level=0.15, release=0.15)
    return save_wav("punch_hit_0.25s.wav", samples)

def generate_05_punch_miss():
    """打一拳打空 - Punch whiff, funny, 0.25s"""
    dur = 0.25
    # High frequency quick whoosh past
    sweep = linear_sweep(300, 800, dur, wave_func=sine_wave)
    sweep = apply_envelope(sweep, attack=0.01, decay=0.08, sustain_level=0.2, release=0.1)
    # Add cartoonish trailing noise
    n = noise(int(dur * SAMPLE_RATE))
    n = apply_envelope(n, attack=0.02, decay=0.15, sustain_level=0.1, release=0.08)
    samples = mix(sweep, n, levels=[0.7, 0.35])
    return save_wav("punch_miss_whiff_0.25s.wav", samples)

def generate_06_throw_machine_lever():
    """操控投掷机 - Mechanical lever pull, gear click, 0.4s"""
    dur = 0.4
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Initial lever engage - low grind
    for i in range(int(0.1 * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        result[i] += square_wave(40, ti) * 0.3 * (i / (0.1 * SAMPLE_RATE))

    # Gear clicks - sharp impulses at intervals
    click_times = [0.08, 0.16, 0.24, 0.32]
    for ct in click_times:
        idx = int(ct * SAMPLE_RATE)
        for j in range(max(0, idx - 10), min(samples, idx + 20)):
            dist = abs(j - idx)
            if dist < 5:
                result[j] += random.uniform(0.3, 0.6) * (1 - dist/5)
            elif dist < 15:
                result[j] += math.sin(2 * math.pi * 800 * (j/SAMPLE_RATE)) * 0.15 * (1 - dist/15)

    result = apply_envelope(result, attack=0.01, decay=0.2, sustain_level=0.5, release=0.15)
    return save_wav("throw_machine_lever_0.4s.wav", result)

def generate_07_projectile_fly():
    """投掷物飞出 - Projectile flying, swoosh, light and speedy, 0.25s"""
    dur = 0.25
    # Quick upward sweep with doppler-like effect
    sweep = linear_sweep(200, 900, dur, wave_func=sine_wave)
    # Add wind noise
    n = noise(int(dur * SAMPLE_RATE))
    n_env = apply_envelope(n, attack=0.01, decay=0.1, sustain_level=0.2, release=0.1)
    sweep = apply_envelope(sweep, attack=0.02, decay=0.1, sustain_level=0.4, release=0.1)
    samples = mix(sweep, n_env, levels=[0.75, 0.25])
    return save_wav("projectile_fly_swoosh_0.25s.wav", samples)

def generate_08_projectile_hit():
    """投掷物命中 - Exaggerated bonk, heavy barrel/brick hit, 0.35s"""
    dur = 0.35
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Heavy low impact
    for i in range(int(0.06 * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        result[i] += square_wave(50, ti) * 0.9 * (1 - i / int(0.06 * SAMPLE_RATE))

    # Bonky resonance - metallic ringing
    for i in range(samples):
        ti = i / SAMPLE_RATE
        # Ringing component
        ring_freq = 300 * math.exp(-i / (SAMPLE_RATE * 0.08))
        result[i] += math.sin(2 * math.pi * ring_freq * ti) * 0.25 * math.exp(-i / (SAMPLE_RATE * 0.1))

    # Add noise burst for impact
    for i in range(int(0.08 * SAMPLE_RATE)):
        result[i] += random.uniform(-0.4, 0.4) * (1 - i / int(0.08 * SAMPLE_RATE))

    result = apply_envelope(result, attack=0.001, decay=0.08, sustain_level=0.1, release=0.2)
    return save_wav("projectile_hit_bonk_0.35s.wav", result)

def generate_09_sudden_two_punches():
    """冷不丁两拳 - Special attack, short charge + two consecutive hits, 0.7s"""
    dur = 0.7
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Charge up (0-0.25s): rising tension
    for i in range(int(0.25 * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        freq = 60 + 200 * (i / int(0.25 * SAMPLE_RATE))
        result[i] += square_wave(freq, ti) * 0.35 * (i / int(0.25 * SAMPLE_RATE))

    # First punch hit at 0.25s
    hit1_start = int(0.25 * SAMPLE_RATE)
    for i in range(int(0.08 * SAMPLE_RATE)):
        idx = hit1_start + i
        if idx < samples:
            ti = (i) / SAMPLE_RATE
            result[idx] += square_wave(40, ti) * 0.85 * (1 - i / int(0.08 * SAMPLE_RATE))
            result[idx] += random.uniform(-0.5, 0.5) * (1 - i / int(0.08 * SAMPLE_RATE))

    # Brief pause (fist pull back implied at 0.33-0.45)
    # Second punch hit at 0.48s
    hit2_start = int(0.48 * SAMPLE_RATE)
    for i in range(int(0.1 * SAMPLE_RATE)):
        idx = hit2_start + i
        if idx < samples:
            ti = (i) / SAMPLE_RATE
            # Second hit slightly heavier
            result[idx] += square_wave(35, ti) * 0.95 * (1 - i / int(0.1 * SAMPLE_RATE))
            result[idx] += random.uniform(-0.6, 0.6) * (1 - i / int(0.1 * SAMPLE_RATE))
            # Ringing resonance
            ring = 200 * math.exp(-i / (SAMPLE_RATE * 0.04))
            result[idx] += math.sin(2 * math.pi * ring * ti) * 0.2

    return save_wav("sudden_two_punches_0.7s.wav", result)


# ============================================================
# CLASS 4: 结算反馈类 (Settlement Feedback)
# ============================================================

def generate_10_dodge_success():
    """闪避成功 - Dodge success, light nimble with wind, 0.25s"""
    dur = 0.25
    # Quick upward flick with wind
    sweep = linear_sweep(300, 1200, dur, wave_func=sine_wave)
    sweep = apply_envelope(sweep, attack=0.01, decay=0.1, sustain_level=0.3, release=0.1)
    # Wind rush
    n = noise(int(dur * SAMPLE_RATE))
    n = apply_envelope(n, attack=0.01, decay=0.15, sustain_level=0.1, release=0.09)
    samples = mix(sweep, n, levels=[0.7, 0.3])
    return save_wav("dodge_success_0.25s.wav", samples)

def generate_11_got_hit():
    """被打中 - Comedic hit reaction, heavy short, not bloody, 0.3s"""
    dur = 0.3
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Main impact - quick low thud
    for i in range(int(0.05 * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        result[i] += square_wave(55, ti) * 0.9 * (1 - i / int(0.05 * SAMPLE_RATE))

    # Body resonance
    for i in range(samples):
        ti = i / SAMPLE_RATE
        res = 150 * math.exp(-i / (SAMPLE_RATE * 0.04))
        result[i] += math.sin(2 * math.pi * res * ti) * 0.2 * math.exp(-i / (SAMPLE_RATE * 0.08))

    # Noise burst
    for i in range(int(0.06 * SAMPLE_RATE)):
        result[i] += random.uniform(-0.3, 0.3) * (1 - i / int(0.06 * SAMPLE_RATE))

    result = apply_envelope(result, attack=0.001, decay=0.06, sustain_level=0.05, release=0.2)
    return save_wav("got_hit_0.3s.wav", result)

def generate_12_hit_from_behind():
    """被背后砸中 - Exaggerated bonk from behind, comedic, 0.4s"""
    dur = 0.4
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Big bonk impact
    for i in range(int(0.08 * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        result[i] += square_wave(45, ti) * 0.95 * (1 - i / int(0.08 * SAMPLE_RATE))

    # Cartoonish ringing - multiple resonant frequencies
    for i in range(samples):
        ti = i / SAMPLE_RATE
        for freq_mult in [1.0, 1.5, 2.7]:
            ring = 250 * freq_mult * math.exp(-i / (SAMPLE_RATE * 0.06))
            result[i] += math.sin(2 * math.pi * ring * ti) * 0.12 * math.exp(-i / (SAMPLE_RATE * 0.15))

    # Impact noise
    for i in range(int(0.1 * SAMPLE_RATE)):
        result[i] += random.uniform(-0.45, 0.45) * (1 - i / int(0.1 * SAMPLE_RATE))

    # Slight before-impact whoosh (anticipation)
    for i in range(int(0.05 * SAMPLE_RATE)):
        idx = max(0, int(0.02 * SAMPLE_RATE) - i)
        if idx < samples:
            result[idx] += linear_sweep(500, 200, 0.05)[i] * 0.2

    result = apply_envelope(result, attack=0.001, decay=0.1, sustain_level=0.08, release=0.25)
    return save_wav("hit_from_behind_bonk_0.4s.wav", result)

def generate_13_fists_collide():
    """双方对拳 - Two fists collide, short impact, 0.25s"""
    dur = 0.25
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Sharp impact - two frequencies colliding
    for i in range(int(0.04 * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        result[i] += square_wave(180, ti) * 0.8 * (1 - i / int(0.04 * SAMPLE_RATE))
        result[i] += square_wave(200, ti) * 0.6 * (1 - i / int(0.04 * SAMPLE_RATE))

    # Quick decay ring
    for i in range(samples):
        ti = i / SAMPLE_RATE
        ring = 500 * math.exp(-i / (SAMPLE_RATE * 0.02))
        result[i] += math.sin(2 * math.pi * ring * ti) * 0.15 * math.exp(-i / (SAMPLE_RATE * 0.06))

    # Brief crack
    for i in range(int(0.02 * SAMPLE_RATE)):
        result[i] += random.uniform(-0.5, 0.5) * (1 - i / int(0.02 * SAMPLE_RATE))

    result = apply_envelope(result, attack=0.001, decay=0.03, sustain_level=0.1, release=0.15)
    return save_wav("fists_collide_0.25s.wav", result)

def generate_14_mutual_damage():
    """双方互伤 - Double hit, left then right, 0.35s"""
    dur = 0.35
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Left hit at 0.05s
    l_start = int(0.05 * SAMPLE_RATE)
    for i in range(int(0.06 * SAMPLE_RATE)):
        idx = l_start + i
        if idx < samples:
            ti = i / SAMPLE_RATE
            result[idx] += square_wave(50, ti) * 0.8 * (1 - i / int(0.06 * SAMPLE_RATE))
            result[idx] += random.uniform(-0.35, 0.35) * (1 - i / int(0.06 * SAMPLE_RATE))

    # Right hit at 0.22s
    r_start = int(0.22 * SAMPLE_RATE)
    for i in range(int(0.06 * SAMPLE_RATE)):
        idx = r_start + i
        if idx < samples:
            ti = i / SAMPLE_RATE
            result[idx] += square_wave(60, ti) * 0.8 * (1 - i / int(0.06 * SAMPLE_RATE))
            result[idx] += random.uniform(-0.35, 0.35) * (1 - i / int(0.06 * SAMPLE_RATE))

    return save_wav("mutual_damage_0.35s.wav", result)

def generate_15_stagger():
    """进入硬直 - Stagger/unbalanced, short low, silly, 0.3s"""
    dur = 0.3
    t = make_time_array(dur)
    # Wobbling descending tones - like losing balance
    result = []
    for i in range(int(dur * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        progress = i / int(dur * SAMPLE_RATE)
        # Wobbling frequency
        wobble = 200 - 150 * progress + 30 * math.sin(2 * math.pi * 8 * ti)
        result.append(square_wave(max(30, wobble), ti) * 0.5 * (1 - progress * 0.7))

    result = apply_envelope(result, attack=0.02, decay=0.15, sustain_level=0.4, release=0.12)
    return save_wav("stagger_dizzy_0.3s.wav", result)

def generate_16_nothing_happens():
    """无事发生 - Nothing happens, funny awkward, 0.25s"""
    dur = 0.25
    t = make_time_array(dur)
    # Two awkward tones with silence between
    result = [0.0] * int(dur * SAMPLE_RATE)

    # First small tone
    for i in range(int(0.06 * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        result[i] += triangle_wave(200, ti) * 0.4 * (1 - i / int(0.06 * SAMPLE_RATE))

    # Awkward pause (silence)

    # Second tone - slightly different, questioning
    start2 = int(0.13 * SAMPLE_RATE)
    for i in range(int(0.08 * SAMPLE_RATE)):
        idx = start2 + i
        if idx < len(result):
            ti = i / SAMPLE_RATE
            # Slightly higher, questioning tone
            result[idx] += triangle_wave(250, ti) * 0.35 * (1 - i / int(0.08 * SAMPLE_RATE))

    return save_wav("nothing_happens_awkward_0.25s.wav", result)


# ============================================================
# CLASS 5: 资源 / 状态类 (Resource/Status)
# ============================================================

def generate_17_energy_plus_one():
    """冷不丁值+1 - Energy +1, crisp upward, 0.2s"""
    dur = 0.2
    # Quick ascending two-note chime
    sweep = linear_sweep(400, 800, dur, wave_func=square_wave)
    sweep = apply_envelope(sweep, attack=0.005, decay=0.08, sustain_level=0.4, release=0.1)
    # Add bright high harmonic
    t = make_time_array(dur)
    high = [square_wave(1200, ti) * 0.15 for ti in t]
    high = apply_envelope(high, attack=0.005, decay=0.06, sustain_level=0.2, release=0.12)
    samples = mix(sweep, high, levels=[0.85, 0.3])
    return save_wav("energy_plus_one_0.2s.wav", samples)

def generate_18_energy_full():
    """冷不丁值满 - 8-bit energy full, bright ascending arpeggio, 0.6s"""
    dur = 0.6
    result = []

    # Ascending arpeggio notes (C major: C4 E4 G4 C5)
    notes = [262, 330, 392, 523, 784]
    note_dur = 0.1
    gap = 0.02

    for idx, freq in enumerate(notes):
        start = idx * (note_dur + gap)
        nsamples = int(note_dur * SAMPLE_RATE)
        for i in range(nsamples):
            ti = i / SAMPLE_RATE
            env = 1.0 - (i / nsamples) * 0.4  # Slight decay per note
            val = square_wave(freq, ti) * 0.6 * env
            # Add octave harmonic
            val += square_wave(freq * 2, ti) * 0.2 * env
            result.append(val)
        # Gap
        for i in range(int(gap * SAMPLE_RATE)):
            result.append(0.0)

    # Final sustained bright note
    sustain_samples = int(0.15 * SAMPLE_RATE)
    for i in range(sustain_samples):
        ti = i / SAMPLE_RATE
        env = 1.0 - (i / sustain_samples) * 0.3
        val = square_wave(784, ti) * 0.5 * env
        val += square_wave(1568, ti) * 0.15 * env
        val += sine_wave(784, ti) * 0.2 * env
        result.append(val)

    # Pad or trim to exact duration
    target_samples = int(dur * SAMPLE_RATE)
    if len(result) < target_samples:
        result += [0.0] * (target_samples - len(result))
    else:
        result = result[:target_samples]

    result = apply_envelope(result, attack=0.01, decay=0.15, sustain_level=0.7, release=0.2)
    return save_wav("energy_full_0.6s.wav", result)

def generate_19_energy_empty():
    """冷不丁值清空 - Energy released, short descending, 0.35s"""
    dur = 0.35
    # Quick energy release - downward sweep
    sweep = linear_sweep(600, 80, dur, wave_func=square_wave)
    sweep = apply_envelope(sweep, attack=0.01, decay=0.1, sustain_level=0.3, release=0.2)
    # Add draining noise component
    n = noise(int(dur * SAMPLE_RATE))
    n = apply_envelope(n, attack=0.01, decay=0.2, sustain_level=0.1, release=0.14)
    samples = mix(sweep, n, levels=[0.8, 0.2])
    return save_wav("energy_empty_0.35s.wav", samples)

def generate_20_machine_cooldown_start():
    """投掷机进入冷却 - Mechanical cooldown, gear stopping, 0.3s"""
    dur = 0.3
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Decelerating gear sound
    for i in range(samples):
        ti = i / SAMPLE_RATE
        # Start fast, slow down
        freq = 300 * math.exp(-i / (SAMPLE_RATE * 0.08)) + 30
        result[i] += square_wave(freq, ti) * 0.3 * (1 - i / samples * 0.6)

    # Final clunk stop
    for i in range(int(0.04 * SAMPLE_RATE)):
        idx = samples - int(0.05 * SAMPLE_RATE) + i
        if 0 <= idx < samples:
            result[idx] += square_wave(25, i/SAMPLE_RATE) * 0.6 * (1 - i / int(0.04 * SAMPLE_RATE))

    result = apply_envelope(result, attack=0.01, decay=0.2, sustain_level=0.4, release=0.08)
    return save_wav("machine_cooldown_start_0.3s.wav", result)

def generate_21_machine_cooldown_end():
    """投掷机冷却结束 - Mechanical restart, light click, 0.35s"""
    dur = 0.35
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Initial click - mechanism re-engaging
    for i in range(int(0.03 * SAMPLE_RATE)):
        result[i] += square_wave(150, i/SAMPLE_RATE) * 0.5 * (1 - i / int(0.03 * SAMPLE_RATE))
        result[i] += random.uniform(-0.3, 0.3) * (1 - i / int(0.03 * SAMPLE_RATE))

    # Spinning up - gears accelerating
    for i in range(int(0.15 * SAMPLE_RATE), samples):
        ti = i / SAMPLE_RATE
        progress = (i - int(0.15 * SAMPLE_RATE)) / (samples - int(0.15 * SAMPLE_RATE))
        freq = 30 + 120 * progress
        result[i] += square_wave(freq, ti) * 0.25 * progress

    # Light ready "ding" at the end
    ding_start = int(0.25 * SAMPLE_RATE)
    for i in range(int(0.08 * SAMPLE_RATE)):
        idx = ding_start + i
        if idx < samples:
            ti = i / SAMPLE_RATE
            result[idx] += sine_wave(600, ti) * 0.4 * (1 - i / int(0.08 * SAMPLE_RATE))

    result = apply_envelope(result, attack=0.01, decay=0.15, sustain_level=0.5, release=0.1)
    return save_wav("machine_cooldown_end_0.35s.wav", result)

def generate_22_hp_decrease():
    """血量减少 - HP loss, short low, 0.25s"""
    dur = 0.25
    t = make_time_array(dur)
    # Descending two-tone: "duh-dun"
    result = []
    samples = int(dur * SAMPLE_RATE)
    half = samples // 2

    for i in range(half):
        ti = i / SAMPLE_RATE
        freq = 250 - 50 * (i / half)
        result.append(square_wave(freq, ti) * 0.6)

    for i in range(half, samples):
        ti = i / SAMPLE_RATE
        freq = 180 - 100 * ((i - half) / (samples - half))
        result.append(square_wave(freq, ti) * 0.55)

    result = apply_envelope(result, attack=0.01, decay=0.1, sustain_level=0.5, release=0.12)
    return save_wav("hp_decrease_0.25s.wav", result)

def generate_23_button_disabled():
    """按钮禁用 - Disabled button error, low short, not harsh, 0.15s"""
    dur = 0.15
    t = make_time_array(dur)
    # Low buzzer-like but gentle
    result = []
    for i in range(int(dur * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        # Two low frequencies beating
        val = square_wave(100, ti) * 0.45 + square_wave(103, ti) * 0.15
        result.append(val)

    result = apply_envelope(result, attack=0.005, decay=0.05, sustain_level=0.3, release=0.08)
    return save_wav("button_disabled_0.15s.wav", result)


# ============================================================
# CLASS 6: 胜负 / 包装类 (Victory/Defeat/Wrapper)
# ============================================================

def generate_24_victory():
    """胜利 - Victory music, bright celebratory, 3s"""
    dur = 3.0
    result = []

    # Victory fanfare melody (C major)
    # Bar 1: Triumphant ascending
    melody = [
        (523, 0.15), (659, 0.15), (784, 0.15), (1047, 0.3),  # C5 E5 G5 C6
        (784, 0.1), (1047, 0.4),  # G5 C6 (held)
    ]

    t = 0.0
    for freq, note_len in melody:
        nsamples = int(note_len * SAMPLE_RATE)
        for i in range(nsamples):
            ti = i / SAMPLE_RATE
            env = 1.0 - (i / nsamples) * 0.35
            val = square_wave(freq, ti) * 0.5 * env
            val += square_wave(freq * 2, ti) * 0.15 * env  # Octave
            val += triangle_wave(freq, ti) * 0.2 * env  # Warmth
            result.append(val)
        t += note_len

    # Bar 2: Rhythmic celebration
    melody2 = [
        (784, 0.1), (1047, 0.1), (784, 0.1), (659, 0.1),
        (784, 0.15), (1047, 0.1), (1319, 0.3),
        (1047, 0.1), (784, 0.3),
    ]

    for freq, note_len in melody2:
        nsamples = int(note_len * SAMPLE_RATE)
        for i in range(nsamples):
            ti = i / SAMPLE_RATE
            env = 1.0 - (i / nsamples) * 0.35
            val = square_wave(freq, ti) * 0.5 * env
            val += square_wave(freq * 2, ti) * 0.15 * env
            val += triangle_wave(freq, ti) * 0.2 * env
            result.append(val)
        t += note_len

    # Final big chord
    final_notes = [(523, 0.5), (659, 0.5), (784, 0.5), (1047, 0.5)]
    nsamples_final = int(0.5 * SAMPLE_RATE)
    for i in range(nsamples_final):
        ti = i / SAMPLE_RATE
        env = 1.0 - (i / nsamples_final) * 0.5
        val = 0.0
        for freq, _ in final_notes:
            val += square_wave(freq, ti) * 0.18 * env
        result.append(val)

    # Trim or pad
    target = int(dur * SAMPLE_RATE)
    if len(result) < target:
        result += [0.0] * (target - len(result))
    else:
        result = result[:target]

    result = apply_envelope(result, attack=0.02, decay=0.3, sustain_level=0.85, release=0.5)
    return save_wav("victory_fanfare_3s.wav", result)

def generate_25_defeat():
    """失败 - Funny defeat, not depressing, 2.5s"""
    dur = 2.5
    result = []

    # Descending comical defeat melody
    # Starting higher, comically falling down
    melody = [
        (440, 0.2), (494, 0.2), (440, 0.2),  # A4 B4 A4
        (392, 0.25), (330, 0.25),  # G4 E4 (uh-oh)
        (262, 0.3), (220, 0.3),  # C4 A3 (falling...)
        (196, 0.15), (165, 0.15), (131, 0.3),  # G3 E3 C3 (wah wah wah)
    ]

    t = 0.0
    for freq, note_len in melody:
        nsamples = int(note_len * SAMPLE_RATE)
        for i in range(nsamples):
            ti = i / SAMPLE_RATE
            env = 1.0 - (i / nsamples) * 0.4
            # Use triangle for softer, more comical feel
            val = triangle_wave(freq, ti) * 0.5 * env
            val += square_wave(freq, ti) * 0.15 * env
            result.append(val)
        t += note_len

    # Final comedic "wah-wah" trombone-like bend
    wah_samples = int(0.4 * SAMPLE_RATE)
    for i in range(wah_samples):
        ti = i / SAMPLE_RATE
        freq = 131 * (0.7 + 0.3 * (1 - i/wah_samples))
        val = triangle_wave(freq, ti) * 0.4 * (1 - i/wah_samples * 0.6)
        result.append(val)

    # Pad
    target = int(dur * SAMPLE_RATE)
    if len(result) < target:
        result += [0.0] * (target - len(result))
    else:
        result = result[:target]

    result = apply_envelope(result, attack=0.02, decay=0.5, sustain_level=0.7, release=0.6)
    return save_wav("defeat_funny_2.5s.wav", result)

def generate_26_draw():
    """平局 - Draw/tie, awkward funny, 1.5s"""
    dur = 1.5
    result = []

    # Neither winning nor losing - awkward meandering melody
    melody = [
        (330, 0.2), (349, 0.2),  # E4 F4
        (330, 0.15), (294, 0.15),  # E4 D4
        (330, 0.25),  # E4 (held, questioning)
        (294, 0.15), (262, 0.15),  # D4 C4
        (294, 0.25),  # D4 (still questioning)
    ]

    t = 0.0
    for freq, note_len in melody:
        nsamples = int(note_len * SAMPLE_RATE)
        for i in range(nsamples):
            ti = i / SAMPLE_RATE
            env = 1.0 - (i / nsamples) * 0.3
            # Triangle wave for softer, awkward tone
            val = triangle_wave(freq, ti) * 0.4 * env
            # Slight vibrato wobble
            val += sine_wave(freq + 5 * math.sin(2*math.pi*4*ti), ti) * 0.1 * env
            result.append(val)
        t += note_len

    # Awkward final tone
    nsamples_end = int(0.3 * SAMPLE_RATE)
    for i in range(nsamples_end):
        ti = i / SAMPLE_RATE
        val = triangle_wave(294, ti) * 0.35 * (1 - i/nsamples_end * 0.5)
        result.append(val)

    target = int(dur * SAMPLE_RATE)
    if len(result) < target:
        result += [0.0] * (target - len(result))
    else:
        result = result[:target]

    result = apply_envelope(result, attack=0.02, decay=0.3, sustain_level=0.7, release=0.3)
    return save_wav("draw_awkward_1.5s.wav", result)

def generate_27_restart():
    """一键重开 - Restart button, crisp powerful, 0.3s"""
    dur = 0.3
    t = make_time_array(dur)
    samples = int(dur * SAMPLE_RATE)
    result = [0.0] * samples

    # Sharp button press click
    for i in range(int(0.03 * SAMPLE_RATE)):
        result[i] += square_wave(300, i/SAMPLE_RATE) * 0.7 * (1 - i / int(0.03 * SAMPLE_RATE))
        result[i] += random.uniform(-0.4, 0.4) * (1 - i / int(0.03 * SAMPLE_RATE))

    # Confirmation tone - quick ascending
    for i in range(int(0.08 * SAMPLE_RATE), samples):
        ti = i / SAMPLE_RATE
        progress = (i - int(0.08 * SAMPLE_RATE)) / (samples - int(0.08 * SAMPLE_RATE))
        freq = 300 + 500 * progress
        result[i] += square_wave(freq, ti) * 0.45 * (1 - progress * 0.5)

    result = apply_envelope(result, attack=0.001, decay=0.12, sustain_level=0.3, release=0.15)
    return save_wav("restart_0.3s.wav", result)

def generate_28_ai_dialog_pop():
    """AI嘴硬短句出现 - Dialog bubble pop, light playful, 0.2s"""
    dur = 0.2
    t = make_time_array(dur)
    # Bubbly pop - quick ascending then settling
    result = []
    for i in range(int(dur * SAMPLE_RATE)):
        ti = i / SAMPLE_RATE
        progress = i / int(dur * SAMPLE_RATE)
        # Popping frequency: quick rise then slight fall
        if progress < 0.3:
            freq = 300 + 700 * (progress / 0.3)
        else:
            freq = 1000 - 400 * ((progress - 0.3) / 0.7)
        val = sine_wave(freq, ti) * 0.6 * (1 - progress * 0.5)
        # Add sparkle
        if progress < 0.4:
            val += sine_wave(freq * 1.5, ti) * 0.2 * (1 - progress / 0.4)
        result.append(val)

    result = apply_envelope(result, attack=0.005, decay=0.06, sustain_level=0.4, release=0.12)
    return save_wav("ai_dialog_pop_0.2s.wav", result)


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Retro Pixel Game Sound Effect Generator")
    print("=" * 60)

    generators = [
        # Class 3: 基础行动类
        ("01_wait_defensive", generate_01_wait),
        ("02_look_back_swish", generate_02_look_back),
        ("03_punch_swing", generate_03_punch_swing),
        ("04_punch_hit", generate_04_punch_hit),
        ("05_punch_miss", generate_05_punch_miss),
        ("06_throw_machine_lever", generate_06_throw_machine_lever),
        ("07_projectile_fly", generate_07_projectile_fly),
        ("08_projectile_hit", generate_08_projectile_hit),
        ("09_sudden_two_punches", generate_09_sudden_two_punches),
        # Class 4: 结算反馈类
        ("10_dodge_success", generate_10_dodge_success),
        ("11_got_hit", generate_11_got_hit),
        ("12_hit_from_behind", generate_12_hit_from_behind),
        ("13_fists_collide", generate_13_fists_collide),
        ("14_mutual_damage", generate_14_mutual_damage),
        ("15_stagger", generate_15_stagger),
        ("16_nothing_happens", generate_16_nothing_happens),
        # Class 5: 资源/状态类
        ("17_energy_plus_one", generate_17_energy_plus_one),
        ("18_energy_full", generate_18_energy_full),
        ("19_energy_empty", generate_19_energy_empty),
        ("20_machine_cooldown_start", generate_20_machine_cooldown_start),
        ("21_machine_cooldown_end", generate_21_machine_cooldown_end),
        ("22_hp_decrease", generate_22_hp_decrease),
        ("23_button_disabled", generate_23_button_disabled),
        # Class 6: 胜负/包装类
        ("24_victory", generate_24_victory),
        ("25_defeat", generate_25_defeat),
        ("26_draw", generate_26_draw),
        ("27_restart", generate_27_restart),
        ("28_ai_dialog_pop", generate_28_ai_dialog_pop),
    ]

    success = 0
    failed = 0

    for name, func in generators:
        try:
            filepath = func()
            filesize = os.path.getsize(filepath)
            print(f"  [OK] {name} -> {os.path.basename(filepath)} ({filesize} bytes)")
            success += 1
        except Exception as e:
            print(f"  [FAIL] {name} -> ERROR: {e}")
            failed += 1

    print()
    print(f"Generated: {success} success, {failed} failed")
    print(f"Output: {OUTPUT_DIR}")
    print("Done!")
