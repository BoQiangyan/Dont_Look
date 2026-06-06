import { CONFIG } from "../src/constants.js";
import { getLegalActions, resolveRound } from "../src/rules.js";
import { beginNextRound, createInitialState, reduceCooldowns } from "../src/state.js";

const failures = [];

const matrixCases = [
  ["front_punch", "guard_front", { damage: 0, attackerGauge: 0, defenderGauge: 0 }],
  ["front_punch", "look_back", { damage: 1, attackerGauge: 1, defenderGauge: 0 }],
  ["front_punch", "fake_out", { damage: 1, attackerGauge: 0, defenderGauge: 2 }],
  ["back_throw", "guard_front", { damage: 2, attackerGauge: 1, defenderGauge: 0, cooldown: true }],
  ["back_throw", "look_back", { damage: 0, attackerGauge: 0, defenderGauge: 1, cooldown: true }],
  ["back_throw", "fake_out", { damage: 2, attackerGauge: 0, defenderGauge: 3, cooldown: true }],
  ["fake_out", "guard_front", { damage: 0, attackerGauge: 1, defenderGauge: 0 }],
  ["fake_out", "look_back", { damage: 0, attackerGauge: 2, defenderGauge: 0 }],
  ["fake_out", "fake_out", { damage: 0, attackerGauge: 0, defenderGauge: 2 }],
  ["double_punch", "guard_front", { damage: 2, attackerGauge: 0, defenderGauge: 0 }],
  ["double_punch", "look_back", { damage: 1, attackerGauge: 0, defenderGauge: 0 }],
  ["double_punch", "fake_out", { damage: 2, attackerGauge: 0, defenderGauge: 3 }],
];

for (const [attackAction, defendAction, expected] of matrixCases) {
  const state = createInitialState();
  state.player.gauge = attackAction === "double_punch" ? CONFIG.maxGauge : 0;

  const result = resolveRound(state, attackAction, defendAction);
  const damage = CONFIG.maxHp - result.state.ai.hp;

  assertEqual(`${attackAction}/${defendAction} damage`, damage, expected.damage);
  assertEqual(`${attackAction}/${defendAction} attacker gauge`, result.state.player.gauge, expected.attackerGauge);
  assertEqual(`${attackAction}/${defendAction} defender gauge`, result.state.ai.gauge, expected.defenderGauge);

  if (expected.cooldown) {
    assertEqual(
      `${attackAction}/${defendAction} cooldown`,
      result.state.player.backThrowCooldownMs,
      CONFIG.backThrowCooldownMs,
    );
  }
}

{
  const state = createInitialState();
  const result = resolveRound(state, "double_punch", "look_back");
  assertEqual("double_punch fallback when gauge is low", result.attackAction, "fake_out");
}

{
  const state = createInitialState();
  state.player.backThrowCooldownMs = 5000;
  const result = resolveRound(state, "back_throw", "guard_front");
  assertEqual("back_throw fallback while cooling down", result.attackAction, "fake_out");
}

{
  const state = createInitialState();
  state.player.gauge = 2;
  const result = resolveRound(state, "fake_out", "look_back");
  assertEqual("gauge clamps to max", result.state.player.gauge, CONFIG.maxGauge);
}

{
  const state = createInitialState();
  const result = resolveRound(state, "front_punch", "guard_front");
  const nextAttacker = beginNextRound(result.state).attackerId;
  assertEqual("next attacker after swap", nextAttacker, "ai");
}

{
  const state = createInitialState();
  const result = resolveRound(state, null, null);
  assertEqual("attacker timeout default", result.attackAction, "fake_out");
  assertEqual("defender timeout default", result.defendAction, "guard_front");
}

{
  const state = createInitialState();
  state.player.backThrowCooldownMs = CONFIG.backThrowCooldownMs;
  const cooled = reduceCooldowns(state, 7001);
  assertEqual("cooldown reduces by elapsed ms", Math.ceil(cooled.player.backThrowCooldownMs), 2999);
}

{
  const state = createInitialState();
  assertDeepEqual("player attack legal actions", getLegalActions(state, "player"), [
    "front_punch",
    "back_throw",
    "fake_out",
  ]);
  assertDeepEqual("ai defend legal actions", getLegalActions(state, "ai"), [
    "guard_front",
    "look_back",
    "fake_out",
  ]);
}

{
  const state = createInitialState();
  state.ai.gauge = CONFIG.maxGauge;
  assertDeepEqual("ai defend legal actions with full gauge", getLegalActions(state, "ai"), [
    "guard_front",
    "look_back",
    "fake_out",
    "double_punch",
  ]);
}

{
  const state = createInitialState();
  state.ai.gauge = CONFIG.maxGauge;
  const result = resolveRound(state, "front_punch", "double_punch");
  assertEqual("defender double_punch damages attacker", result.state.player.hp, CONFIG.maxHp - CONFIG.doublePunchDamage);
  assertEqual("defender double_punch spends gauge", result.state.ai.gauge, 0);
  assertEqual("defender double_punch does not block incoming attack", result.state.ai.hp, CONFIG.maxHp - CONFIG.frontPunchDamage);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${matrixCases.length} matrix cases and rule invariants successfully.`);

function assertEqual(label, actual, expected) {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
}

function assertDeepEqual(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) failures.push(`${label}: expected ${expectedJson}, got ${actualJson}`);
}
