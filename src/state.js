import { CONFIG } from "./constants.js?v=text-swap-20260531";

// 创建单个角色状态。playerId 只用于规则层识别，不绑定任何 UI。
export function createFighterState(id) {
  return {
    id,
    hp: CONFIG.maxHp,
    gauge: 0,
    backThrowCooldownMs: 0,
    lastAction: null,
    actionHistory: [],
  };
}

export function createInitialState() {
  return {
    round: 1,
    phase: "selecting",
    attackerId: "player",
    defenderId: "ai",
    player: createFighterState("player"),
    ai: createFighterState("ai"),
    history: [],
    winner: null,
    message: "你到底猛不猛回头？",
  };
}

export function beginNextRound(state) {
  return {
    ...state,
    round: state.round + 1,
    phase: "selecting",
    attackerId: state.defenderId,
    defenderId: state.attackerId,
    winner: null,
    message: "请选择行动",
  };
}

export function reduceCooldowns(state, elapsedMs) {
  if (elapsedMs <= 0) return state;

  return {
    ...state,
    player: reduceFighterCooldown(state.player, elapsedMs),
    ai: reduceFighterCooldown(state.ai, elapsedMs),
  };
}

function reduceFighterCooldown(fighter, elapsedMs) {
  return {
    ...fighter,
    backThrowCooldownMs: Math.max(0, fighter.backThrowCooldownMs - elapsedMs),
  };
}

export function clampGauge(value) {
  return Math.max(0, Math.min(CONFIG.maxGauge, value));
}

export function clampHp(value) {
  return Math.max(0, Math.min(CONFIG.maxHp, value));
}
