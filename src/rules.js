import { ACTIONS, CONFIG } from "./constants.js?v=text-swap-20260531";
import { clampGauge, clampHp } from "./state.js?v=text-swap-20260531";

const ATTACK_ACTIONS = ["front_punch", "back_throw", "fake_out", "double_punch"];
const DEFEND_ACTIONS = ["guard_front", "look_back", "fake_out", "double_punch"];

export function getRoleForActor(state, actorId) {
  if (state.attackerId === actorId) return "attacker";
  if (state.defenderId === actorId) return "defender";
  return null;
}

export function getActionAvailability(state, actorId) {
  const role = getRoleForActor(state, actorId);
  const fighter = state[actorId];

  if (role === "attacker") {
    return {
      front_punch: { enabled: true, reason: "" },
      back_throw: {
        enabled: fighter.backThrowCooldownMs <= 0,
        reason: fighter.backThrowCooldownMs > 0 ? "冷却中" : "",
      },
      fake_out: { enabled: true, reason: "" },
      double_punch: {
        enabled: fighter.gauge >= CONFIG.maxGauge,
        reason: fighter.gauge < CONFIG.maxGauge ? "心眼值不足" : "",
      },
    };
  }

  if (role === "defender") {
    return {
      guard_front: { enabled: true, reason: "" },
      look_back: { enabled: true, reason: "" },
      fake_out: { enabled: true, reason: "" },
      double_punch: {
        enabled: fighter.gauge >= CONFIG.maxGauge,
        reason: fighter.gauge < CONFIG.maxGauge ? "心眼值不足" : "",
      },
    };
  }

  return {};
}

export function getLegalActions(state, actorId) {
  return Object.entries(getActionAvailability(state, actorId))
    .filter(([, availability]) => availability.enabled)
    .map(([action]) => action);
}

export function normalizeAction(state, actorId, action) {
  const role = getRoleForActor(state, actorId);
  const fallback = role === "attacker" ? "fake_out" : "guard_front";
  return getActionAvailability(state, actorId)[action]?.enabled ? action : fallback;
}

export function toControllerState(state, actorId) {
  const opponentId = actorId === "player" ? "ai" : "player";
  return {
    self: toAiFighterState(state[actorId]),
    opponent: toAiFighterState(state[opponentId]),
    role: getRoleForActor(state, actorId),
    turnNumber: state.round,
    history: state.history,
    legalActions: getLegalActions(state, actorId),
  };
}

export function resolveRound(state, rawPlayerAction, rawAiAction) {
  const attackerId = state.attackerId;
  const defenderId = state.defenderId;
  const rawActions = {
    player: rawPlayerAction,
    ai: rawAiAction,
  };
  const attackAction = normalizeAction(state, attackerId, rawActions[attackerId]);
  const defendAction = normalizeAction(state, defenderId, rawActions[defenderId]);
  const attackerDelta = createDelta();
  const defenderDelta = createDelta();
  const events = [];

  applyAttack({
    attackerId,
    defenderId,
    attackAction,
    defendAction,
    attackerDelta,
    defenderDelta,
    events,
  });

  const nextAttacker = applyDelta(state[attackerId], attackAction, attackerDelta);
  const nextDefender = applyDelta(state[defenderId], defendAction, defenderDelta);
  const nextPlayer = attackerId === "player" ? nextAttacker : nextDefender;
  const nextAi = attackerId === "ai" ? nextAttacker : nextDefender;
  const winner = getWinner(nextPlayer.hp, nextAi.hp, attackerId);
  const historyEntry = {
    attackerId,
    defenderId,
    attackAction,
    defendAction,
    damage: defenderDelta.damage,
    surpriseDelta: {
      attacker: attackerDelta.gauge,
      defender: defenderDelta.gauge,
    },
  };

  return {
    state: {
      ...state,
      phase: winner ? "finished" : "result",
      player: nextPlayer,
      ai: nextAi,
      winner,
      history: [...state.history.slice(-9), historyEntry],
      message: pickHeadline(events, winner),
    },
    playerAction: attackerId === "player" ? attackAction : defendAction,
    aiAction: attackerId === "ai" ? attackAction : defendAction,
    attackAction,
    defendAction,
    attackerId,
    defenderId,
    events,
    effects: buildEffects(attackerId, defenderId, attackAction, defendAction, events),
  };
}

function createDelta() {
  return {
    damage: 0,
    gauge: 0,
    spendGauge: false,
    backThrowCooldownMs: null,
  };
}

function applyAttack(context) {
  const {
    attackerId,
    defenderId,
    attackAction,
    defendAction,
    attackerDelta,
    defenderDelta,
    events,
  } = context;

  if (defendAction === "double_punch") {
    defenderDelta.spendGauge = true;
    attackerDelta.damage += CONFIG.doublePunchDamage;
    events.push({
      type: "doublePunchHit",
      actor: defenderId,
      target: attackerId,
      text: "连着来两下！",
    });
  }

  if (defendAction === "fake_out") {
    applyDefenderFakeOut({
      attackerId,
      defenderId,
      attackAction,
      attackerDelta,
      defenderDelta,
      events,
    });
    return;
  }

  if (attackAction === "front_punch") {
    if (defendAction === "guard_front") {
      events.push({
        type: "frontBlocked",
        actor: defenderId,
        target: attackerId,
        text: `${nameOf(defenderId)}就不回头，正面防住了`,
      });
      return;
    }

    defenderDelta.damage += CONFIG.frontPunchDamage;
    attackerDelta.gauge += 1;
    events.push({
      type: "frontPunchHit",
      actor: attackerId,
      target: defenderId,
      text: "还真猛回头啊？正面吃一拳！",
    });
    return;
  }

  if (attackAction === "back_throw") {
    attackerDelta.backThrowCooldownMs = CONFIG.backThrowCooldownMs;

    if (defendAction === "look_back") {
      defenderDelta.gauge += 1;
      events.push({
        type: "backThrowBlocked",
        actor: defenderId,
        target: attackerId,
        text: "被你看穿了！",
      });
      return;
    }

    defenderDelta.damage += CONFIG.backThrowDamage;
    attackerDelta.gauge += 1;
    events.push({
      type: "backThrowHit",
      actor: attackerId,
      target: defenderId,
      text: "背后梆一下！",
    });
    return;
  }

  if (attackAction === "fake_out") {
    const gained = defendAction === "look_back" ? 2 : 1;
    attackerDelta.gauge += gained;
    events.push({
      type: defendAction === "look_back" ? "fakeLookBack" : "fakeGuardFront",
      actor: attackerId,
      target: defenderId,
        text:
        defendAction === "look_back"
          ? "背后啥也没有！心眼值暴涨！"
          : "没骗到回头，但气势攒起来了。",
    });
    return;
  }

  if (attackAction === "double_punch") {
    attackerDelta.spendGauge = true;
    const damage =
      defendAction === "look_back" ? CONFIG.reducedDoublePunchDamage : CONFIG.doublePunchDamage;
    defenderDelta.damage += damage;
    events.push({
      type: "doublePunchHit",
      actor: attackerId,
      target: defenderId,
      text: "连着来两下！",
    });
  }
}

function applyDefenderFakeOut(context) {
  const { attackerId, defenderId, attackAction, attackerDelta, defenderDelta, events } = context;

  if (attackAction === "front_punch") {
    defenderDelta.damage += CONFIG.frontPunchDamage;
    defenderDelta.gauge += 2;
    events.push({
      type: "frontPunchHit",
      actor: attackerId,
      target: defenderId,
      text: "啥也没防住，正面吃一下，但心眼值涨了。",
    });
    return;
  }

  if (attackAction === "back_throw") {
    attackerDelta.backThrowCooldownMs = CONFIG.backThrowCooldownMs;
    defenderDelta.damage += CONFIG.backThrowDamage;
    defenderDelta.gauge += 3;
    events.push({
      type: "backThrowHit",
      actor: attackerId,
      target: defenderId,
      text: "背后没防住，但心眼值涨了。",
    });
    return;
  }

  if (attackAction === "fake_out") {
    defenderDelta.gauge += 2;
    events.push({
      type: "fakeGuardFront",
      actor: defenderId,
      target: attackerId,
      text: "双方都没打，心眼值攒起来了。",
    });
    return;
  }

  if (attackAction === "double_punch") {
    attackerDelta.spendGauge = true;
    defenderDelta.damage += CONFIG.doublePunchDamage;
    defenderDelta.gauge += 3;
    events.push({
      type: "doublePunchHit",
      actor: attackerId,
      target: defenderId,
      text: "没防住连着来两下，但心眼值涨了。",
    });
  }
}

function applyDelta(fighter, action, delta) {
  const nextGauge = delta.spendGauge ? 0 : fighter.gauge + delta.gauge;
  return {
    ...fighter,
    hp: clampHp(fighter.hp - delta.damage),
    gauge: clampGauge(nextGauge),
    backThrowCooldownMs:
      delta.backThrowCooldownMs === null ? fighter.backThrowCooldownMs : delta.backThrowCooldownMs,
    lastAction: action,
    actionHistory: [...fighter.actionHistory.slice(-4), action],
  };
}

function getWinner(playerHp, aiHp, attackerId) {
  if (playerHp <= 0 && aiHp <= 0) return attackerId;
  if (playerHp <= 0) return "ai";
  if (aiHp <= 0) return "player";
  return null;
}

function pickHeadline(events, winner) {
  if (winner === "player") return "你赢了，梆得漂亮。";
  if (winner === "ai") return "你被安排得明明白白。";
  return events[0]?.text ?? "无事发生";
}

function buildEffects(attackerId, defenderId, attackAction, defendAction, events) {
  const defenderHit = events.some((event) => event.target === defenderId && event.type.endsWith("Hit"));
  const attackerHit = events.some((event) => event.target === attackerId && event.type.endsWith("Hit"));
  const defenderDodged = events.some((event) => event.actor === defenderId && event.type.endsWith("Blocked"));

  return {
    playerAction: attackerId === "player" ? attackAction : defendAction,
    aiAction: attackerId === "ai" ? attackAction : defendAction,
    playerHit: (defenderId === "player" && defenderHit) || (attackerId === "player" && attackerHit),
    aiHit: (defenderId === "ai" && defenderHit) || (attackerId === "ai" && attackerHit),
    playerDodged: defenderId === "player" && defenderDodged,
    aiDodged: defenderId === "ai" && defenderDodged,
    machineUsedByPlayer: attackerId === "player" && attackAction === "back_throw",
    machineUsedByAi: attackerId === "ai" && attackAction === "back_throw",
  };
}

function toAiFighterState(fighter) {
  return {
    hp: fighter.hp,
    surprise: fighter.gauge,
    backThrowCooldownMs: fighter.backThrowCooldownMs,
  };
}

function nameOf(id) {
  if (id === "player") return "你";
  if (id === "ai") return "AI";
  return "双方";
}

export const ACTION_GROUPS = {
  attacker: ATTACK_ACTIONS,
  defender: DEFEND_ACTIONS,
};
