import { AI_TAUNTS } from "./constants.js?v=text-swap-20260531";
import { getLegalActions, toControllerState } from "./rules.js?v=text-swap-20260531";

// AI 和未来在线玩家使用同一层行动 ID。AI 只返回行动，规则层会二次校验。
export function chooseAiAction(state, difficulty = "normal") {
  const input = toControllerState(state, "ai");
  const legalActions = getLegalActions(state, "ai");
  const weights = Object.fromEntries(legalActions.map((action) => [action, baseWeight(action)]));

  if (difficulty === "easy") {
    addNoise(weights, 0.25);
  }

  if (difficulty === "normal") {
    addRoleAwareWeights(weights, input, 1);
    addNoise(weights, 0.25);
  }

  if (difficulty === "annoying") {
    addRoleAwareWeights(weights, input, 1.25);
    if (weights.double_punch) weights.double_punch += 1.1;
    if (weights.back_throw) weights.back_throw += 0.6;
    addNoise(weights, 0.2);
  }

  return weightedPick(weights);
}

export function pickAiTaunt() {
  return AI_TAUNTS[Math.floor(Math.random() * AI_TAUNTS.length)];
}

function baseWeight(action) {
  const weights = {
    front_punch: 1.1,
    back_throw: 1,
    fake_out: 0.9,
    double_punch: 1.4,
    guard_front: 1.15,
    look_back: 0.95,
  };
  return weights[action] ?? 1;
}

function addRoleAwareWeights(weights, input, amount) {
  if (input.role === "attacker") {
    const recentDefends = input.history
      .filter((entry) => entry.defenderId === "player")
      .slice(-3)
      .map((entry) => entry.defendAction);

    if (input.self.surprise >= 3 && weights.double_punch) weights.double_punch += 1.2 * amount;
    if (input.opponent.hp <= 2 && weights.front_punch) weights.front_punch += 0.5 * amount;
    if (recentDefends.includes("guard_front") && weights.back_throw) weights.back_throw += 0.8 * amount;
    if (recentDefends.includes("look_back")) {
      if (weights.front_punch) weights.front_punch += 0.7 * amount;
      if (weights.fake_out) weights.fake_out += 0.6 * amount;
    }
  }

  if (input.role === "defender") {
    const opponentBackThrowReady = input.opponent.backThrowCooldownMs <= 0;
    const opponentHasDouble = input.opponent.surprise >= 3;
    const recentAttacks = input.history
      .filter((entry) => entry.attackerId === "player")
      .slice(-3)
      .map((entry) => entry.attackAction);

    if (!opponentBackThrowReady && weights.guard_front) weights.guard_front += 1.2 * amount;
    if (opponentBackThrowReady && weights.look_back) weights.look_back += 0.35 * amount;
    if (opponentHasDouble && weights.look_back) weights.look_back += 0.55 * amount;
    if (recentAttacks.filter((action) => action === "fake_out").length >= 2 && weights.guard_front) {
      weights.guard_front += 0.75 * amount;
    }
  }
}

function addNoise(weights, amount) {
  for (const action of Object.keys(weights)) {
    weights[action] += Math.random() * amount;
  }
}

function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [action, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return action;
  }

  return entries[0][0];
}
