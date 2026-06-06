// sound.js - Retro pixel sound effect manager for Cold Bang Bang
const SOUND_BASE = './assets/sounds/';

const SOUND_MAP = {
  // Class 3: Basic actions
  wait: 'wait_defensive_0.25s.wav',
  lookBack: 'look_back_swish_0.25s.wav',
  punchSwing: 'punch_swing_0.2s.wav',
  punchHit: 'punch_hit_0.25s.wav',
  punchMiss: 'punch_miss_whiff_0.25s.wav',
  machineLever: 'throw_machine_lever_0.4s.wav',
  projectileFly: 'projectile_fly_swoosh_0.25s.wav',
  projectileHit: 'projectile_hit_bonk_0.35s.wav',
  doublePunch: 'sudden_two_punches_0.7s.wav',

  // Class 4: Settlement feedback
  dodge: 'dodge_success_0.25s.wav',
  gotHit: 'got_hit_0.3s.wav',
  hitFromBehind: 'hit_from_behind_bonk_0.4s.wav',
  fistsCollide: 'fists_collide_0.25s.wav',
  mutualDamage: 'mutual_damage_0.35s.wav',
  stagger: 'stagger_dizzy_0.3s.wav',
  nothingHappens: 'nothing_happens_awkward_0.25s.wav',

  // Class 5: Resource / Status
  energyPlus: 'energy_plus_one_0.2s.wav',
  energyFull: 'energy_full_0.6s.wav',
  energyEmpty: 'energy_empty_0.35s.wav',
  cooldownStart: 'machine_cooldown_start_0.3s.wav',
  cooldownEnd: 'machine_cooldown_end_0.35s.wav',
  hpDecrease: 'hp_decrease_0.25s.wav',
  buttonDisabled: 'button_disabled_0.15s.wav',

  // Class 6: Victory / Defeat / Wrapper
  victory: 'victory_fanfare_3s.wav',
  defeat: 'defeat_funny_2.5s.wav',
  draw: 'draw_awkward_1.5s.wav',
  restart: 'restart_0.3s.wav',
  dialogPop: 'ai_dialog_pop_0.2s.wav',
};

// Volume presets per sound category
const VOLUME = {
  victory: 0.72,
  defeat: 0.72,
  draw: 0.72,
  energyFull: 0.65,
  buttonDisabled: 0.40,
  dialogPop: 0.45,
  energyPlus: 0.50,
  energyEmpty: 0.55,
  cooldownEnd: 0.48,
  cooldownStart: 0.55,
  nothingHappens: 0.55,
  hpDecrease: 0.60,
  restart: 0.60,
};

class SoundManager {
  constructor() {
    this.enabled = true;
    this.pool = {};
    this._unlocked = false;
  }

  preloadAll() {
    for (const [key, filename] of Object.entries(SOUND_MAP)) {
      const audio = new Audio(SOUND_BASE + filename);
      audio.preload = 'auto';
      this.pool[key] = audio;
    }
  }

  unlock() {
    if (this._unlocked) return;
    // Browsers require a user gesture before playing audio.
    // One silent play is enough to unlock the entire AudioContext.
    const first = Object.values(this.pool)[0];
    if (first) {
      first.volume = 0;
      first.play().then(() => {
        first.pause();
        first.currentTime = 0;
        first.volume = 1;
      }).catch(() => {});
    }
    this._unlocked = true;
  }

  play(key, delayMs = 0) {
    if (!this.enabled) return;
    const original = this.pool[key];
    if (!original) return;

    const fire = () => {
      const clone = original.cloneNode();
      clone.volume = VOLUME[key] ?? 0.85;
      clone.play().catch(() => {});
    };

    if (delayMs > 0) {
      setTimeout(fire, delayMs);
    } else {
      fire();
    }
  }

  setEnabled(val) {
    this.enabled = val;
  }
}

export const sound = new SoundManager();
