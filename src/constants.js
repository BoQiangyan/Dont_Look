// 所有平衡参数集中放在这里，后续调数值时优先改这个文件。
export const CONFIG = {
  maxHp: 5,
  maxGauge: 3,
  roundSeconds: 3,
  frontPunchDamage: 1,
  backThrowDamage: 2,
  doublePunchDamage: 2,
  reducedDoublePunchDamage: 1,
  backThrowCooldownMs: 10000,
  cooldownEmphasisMs: 3000,
  revealMs: 950,
  resultMs: 1150,
};

export const ACTIONS = {
  front_punch: {
    role: "attacker",
    label: "正面来一下",
    short: "正面",
    description: "正面攻击，抓猛回头。",
  },
  back_throw: {
    role: "attacker",
    label: "投掷铁块",
    short: "铁块",
    description: "背后攻击，打就不回头。",
  },
  fake_out: {
    role: "attacker",
    label: "啥也不干",
    short: "骗",
    description: "骗对方判断，攒心眼值。",
  },
  double_punch: {
    role: "attacker",
    label: "连着来两下",
    short: "连两下",
    description: "满 3 点可用，无法完全防住。",
  },
  guard_front: {
    role: "defender",
    label: "就不回头",
    short: "不回",
    description: "防正面拳，赌背后没东西。",
  },
  look_back: {
    role: "defender",
    label: "猛回头",
    short: "回头",
    description: "防背后铁块，但正面露破绽。",
  },
};

// AI 文案是表现层的一部分，不影响规则。
export const AI_TAUNTS = [
  "你回头啊。",
  "我没动，是机器动的。",
  "刚刚那拳是风。",
  "这叫战术。",
  "你别老看后面。",
  "我这是传统功夫。",
];
