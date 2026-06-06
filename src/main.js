import { ACTIONS, CONFIG } from "./constants.js?v=text-swap-20260531";
import { chooseAiAction } from "./ai.js?v=text-swap-20260531";
import { getActionAvailability, getLegalActions, getRoleForActor, resolveRound } from "./rules.js?v=text-swap-20260531";
import { beginNextRound, createInitialState, reduceCooldowns } from "./state.js?v=text-swap-20260531";
import { sound } from "./sound.js?v=sound-20260602";
import { network } from "./network.js?v=fixed-world-nocache-20260606";

console.info("[ColdBangBang] build FIXED-WORLD-20260606");

const elements = {
  mainMenu: document.querySelector("#mainMenu"),
  app: document.querySelector("#app"),
  startGameBtn: document.querySelector("#startGameBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  modalLayer: document.querySelector("#modalLayer"),
  howToPlayModal: document.querySelector("#howToPlayModal"),
  settingsModal: document.querySelector("#settingsModal"),
  pauseModal: document.querySelector("#pauseModal"),
  modalCloseButtons: [...document.querySelectorAll("[data-close-modal]")],
  howToPlayImage: document.querySelector("#howToPlayImage"),
  howToPlayPageCount: document.querySelector("#howToPlayPageCount"),
  howToPlayTitle: document.querySelector("#howToPlayTitle"),
  howToPlayText: document.querySelector("#howToPlayText"),
  howToPrevBtn: document.querySelector("#howToPrevBtn"),
  howToNextBtn: document.querySelector("#howToNextBtn"),
  shakeToggle: document.querySelector("#shakeToggle"),
  timerPopToggle: document.querySelector("#timerPopToggle"),
  soundToggle: document.querySelector("#soundToggle"),
  continueGameBtn: document.querySelector("#continueGameBtn"),
  returnMainMenuBtn: document.querySelector("#returnMainMenuBtn"),
  arena: document.querySelector("#arena"),
  aiHp: document.querySelector("#aiHp"),
  playerHp: document.querySelector("#playerHp"),
  aiGauge: document.querySelector("#aiGauge"),
  playerGauge: document.querySelector("#playerGauge"),
  aiCooldown: document.querySelector("#aiCooldown"),
  playerCooldown: document.querySelector("#playerCooldown"),
  aiFighter: document.querySelector("#aiFighter"),
  playerFighter: document.querySelector("#playerFighter"),
  projectile: document.querySelector("#projectile"),
  burstText: document.querySelector("#burstText"),
  roundLabel: document.querySelector("#roundLabel"),
  timer: document.querySelector("#timer"),
  choiceLabel: document.querySelector("#choiceLabel"),
  actionButtons: [...document.querySelectorAll(".action-btn")],
  actionGrid: document.querySelector(".action-grid"),
  restartBtn: document.querySelector("#restartBtn"),
  menuBtn: document.querySelector("#menuBtn"),

  // Online mode
  onlineMatchBtn: document.querySelector("#onlineMatchBtn"),
  matchmakingOverlay: document.querySelector("#matchmakingOverlay"),
  matchmakingStatus: document.querySelector("#matchmakingStatus"),
  cancelMatchBtn: document.querySelector("#cancelMatchBtn"),
  onlineIndicator: document.querySelector("#onlineIndicator"),
  charSelectScreen: document.querySelector("#charSelectScreen"),
  pickZhangBtn: document.querySelector("#pickZhang"),
  pickMichelBtn: document.querySelector("#pickMichel"),
  charSelectBackBtn: document.querySelector("#charSelectBackBtn"),
};

let state = createInitialState();
let selectedActions = { player: null, ai: null };
let timerId = null;
let prepTimerId = null;
let prepEndsAt = 0;
let roundEndsAt = 0;
let lastCountdownBeat = null;
let lastPrepCountdownBeat = null;
let lastTickAt = performance.now();
let gameStarted = false;
let gamePaused = false;
let pausedPrepRemainingMs = 0;
let pausedRoundRemainingMs = 0;
let pendingResult = null;
let resultTimeoutId = null;
let nextRoundTimeoutId = null;
let resultTimeoutDeadline = 0;
let nextRoundTimeoutDeadline = 0;
let resultTimeoutRemainingMs = null;
let nextRoundTimeoutRemainingMs = null;
let howToPageIndex = 0;
let settings = {
  screenShake: true,
  timerPop: true,
};

// ---- Online mode state ----
let isOnlineMode = false;               // true = PvP 联网, false = 单机 AI
let onlineTurnSeconds = 30;             // 与服务器约定的回合秒数
let onlineAttackerId = null;            // 本回合服务器指定的进攻方 actorId
let onlineActionSent = false;           // 本回合已向服务器提交过行动
let onlineFlushReceived = false;        // 已收到本回合的 TURN_FLUSH
let onlineMySide = null;                // "attacker" | "defender" — 当前回合我的身份
let pickedChar = null;                  // { id: "zhang"|"michel", name: string } — 选中的角色

const HOW_TO_PAGES = [
  {
    image: "./assets/ui/howto-final/howto-page-01-turn-goal.png",
    title: "目标和回合",
    text: "把对方血量打到 0 就赢。游戏采用攻防轮换：一方进攻，一方防守；本回合结束后，双方身份交换。",
  },
  {
    image: "./assets/ui/howto-final/howto-page-02-defense-choice.png",
    title: "防守方怎么选",
    text: "防守方只有两个选择：就不回头，防正面拳；猛回头，防背后铁块。你的核心判断是：背后到底有没有东西？",
  },
  {
    image: "./assets/ui/howto-final/howto-page-03-attack-punish.png",
    title: "进攻方怎么打",
    text: "进攻方可以正面来一下、投掷铁块，或啥也不干。正面来一下打猛回头的人，投掷铁块砸就不回头的人。",
  },
  {
    image: "./assets/ui/howto-final/howto-page-04-fake-out.png",
    title: "啥也不干不是放弃",
    text: "啥也不干是骗招。你不出手，但如果对方被你骗着回头或防错方向，你就能获得心眼值。",
  },
  {
    image: "./assets/ui/howto-final/howto-page-05-double-punch.png",
    title: "连着来两下",
    text: "心眼值是骗术能量，上限 3 点。打中对方猜错、防住背后铁块，或用啥也不干骗到对方，都能获得心眼值。满 3 点后可用连着来两下，出招后清空；它不能被完全防住，是骗到对方后的强力奖励。",
  },
];

const EFFECT_WORDS = {
  playerWin: "./assets/effect-words/player-win.png?v=action-ui-20260531",
  playerLose: "./assets/effect-words/player-lose.png?v=action-ui-20260531",
  frontBlocked: "./assets/effect-words/front-blocked.png?v=action-ui-20260531",
  frontPunchHit: "./assets/effect-words/front-punch-hit.png?v=action-ui-20260531",
  backThrowBlocked: "./assets/effect-words/back-throw-blocked.png?v=action-ui-20260531",
  backThrowHit: "./assets/effect-words/back-throw-hit.png?v=action-ui-20260531",
  fakeLookBack: "./assets/effect-words/fake-look-back.png?v=action-ui-20260531",
  fakeGuardFront: "./assets/effect-words/fake-guard-front.png?v=action-ui-20260531",
  doublePunchHit: "./assets/effect-words/double-punch-hit.png?v=action-ui-20260531",
};

bindEvents();
installGameInterface();
renderMenu();

function bindEvents() {
  elements.startGameBtn.addEventListener("click", startNewGame);
  elements.settingsBtn.addEventListener("click", () => openModal("settings"));
  elements.modalCloseButtons.forEach((button) => button.addEventListener("click", closeModals));
  elements.modalLayer.addEventListener("click", (event) => {
    if (elements.pauseModal.hidden === false) return;
    if (event.target === elements.modalLayer) closeModals();
  });
  elements.howToPrevBtn.addEventListener("click", () => {
    howToPageIndex = Math.max(0, howToPageIndex - 1);
    renderHowToPage();
  });
  elements.howToNextBtn.addEventListener("click", () => {
    howToPageIndex = Math.min(HOW_TO_PAGES.length - 1, howToPageIndex + 1);
    renderHowToPage();
  });
  elements.shakeToggle.addEventListener("change", () => {
    settings.screenShake = elements.shakeToggle.checked;
  });
  elements.timerPopToggle.addEventListener("change", () => {
    settings.timerPop = elements.timerPopToggle.checked;
  });
  elements.soundToggle.addEventListener("change", () => {
    sound.setEnabled(elements.soundToggle.checked);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.pauseModal.hidden === false) return;
    if (event.key === "Escape") closeModals();
  });

  elements.actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.phase !== "selecting" || button.disabled) return;
      submitAction("player", button.dataset.action);
    });
  });

  elements.actionGrid.addEventListener("click", (event) => {
    const btn = event.target.closest(".action-btn");
    if (btn && btn.disabled) {
      sound.play("buttonDisabled");
    }
  });

  elements.restartBtn.addEventListener("click", () => {
    sound.play("restart");
    clearTimers();
    clearScheduledRoundTimeouts();
    state = createInitialState();
    selectedActions = { player: null, ai: null };
    resetAnimationClasses();
    startPrepCountdown();
  });

  elements.menuBtn.addEventListener("click", pauseGame);
  elements.continueGameBtn.addEventListener("click", resumeGame);
  elements.returnMainMenuBtn.addEventListener("click", renderMenu);

  // ---- Online mode events ----
  bindOnlineEvents();
}

// ============================================================
// Online mode
// ============================================================

function bindOnlineEvents() {
  elements.onlineMatchBtn.addEventListener("click", showCharSelect);
  elements.cancelMatchBtn.addEventListener("click", cancelOnlineMatch);

  // Character selection
  elements.pickZhangBtn.addEventListener("click", () => onCharacterPicked("zhang", "马大愣"));
  elements.pickMichelBtn.addEventListener("click", () => onCharacterPicked("michel", "麦克老六"));
  elements.charSelectBackBtn.addEventListener("click", hideCharSelect);

  network.on("waiting", () => {
    elements.matchmakingStatus.textContent = "正在寻找对手……";
  });

  network.on("matched", onNetworkMatched);

  network.on("actionConfirmed", () => {
    onlineActionSent = true;
    elements.choiceLabel.textContent = "已选择，等待对手……";
    lockAllActionButtons();
  });

  network.on("opponentSelected", () => {
    elements.choiceLabel.textContent = "对手已选择……";
  });

  network.on("turnFlush", onTurnFlush);

  network.on("opponentDisconnected", () => {
    endOnlineGame("对手断开了连接");
  });

  network.on("opponentSurrendered", () => {
    endOnlineGame("对手投降了，你赢了！");
  });

  network.on("serverShutdown", () => {
    endOnlineGame("服务器已关闭");
  });

  network.on("disconnected", () => {
    if (isOnlineMode) {
      endOnlineGame("与服务器的连接已断开");
    }
  });

  network.on("error", (data) => {
    if (data.message) {
      showBurstText(data.message);
      setTimeout(() => { if (state.phase === "selecting") showBurstText(state.message); }, 2000);
    }
  });
}

function showCharSelect() {
  elements.mainMenu.hidden = true;
  elements.charSelectScreen.hidden = false;
}

function hideCharSelect() {
  elements.mainMenu.hidden = false;
  elements.charSelectScreen.hidden = true;
}

function onCharacterPicked(id, name) {
  pickedChar = { id, name };
  elements.charSelectScreen.hidden = true;
  startOnlineMatch(pickedChar);
}

function startOnlineMatch(profile) {
  network.connect();
  if (!network.connected) {
    network.on("connected", () => {
      network.joinQueue({ name: profile.name, characterId: profile.id });
      showMatchmakingUI();
    }, { once: true });
    if (network.connected) {
      network.joinQueue({ name: profile.name, characterId: profile.id });
      showMatchmakingUI();
    }
  } else {
    network.joinQueue({ name: profile.name, characterId: profile.id });
    showMatchmakingUI();
  }
}

function showMatchmakingUI() {
  elements.matchmakingOverlay.hidden = false;
  elements.matchmakingStatus.textContent = "正在寻找对手……";
}

function cancelOnlineMatch() {
  network.leaveQueue();
  elements.matchmakingOverlay.hidden = true;
  hideCharSelect();
}

function onNetworkMatched(data) {
  elements.matchmakingOverlay.hidden = true;
  isOnlineMode = true;
  onlineTurnSeconds = data.turnSeconds || 30;
  onlineMySide = data.side;
  onlineAttackerId = "player";

  // Mirror the initial state to match the server-assigned roles
  clearTimers();
  clearScheduledRoundTimeouts();
  state = createInitialState();
  state.attackerId = "player";
  state.defenderId = "ai";
  // In online mode, "ai" actor is actually the human opponent — rename in UI
  selectedActions = { player: null, ai: null };
  gameStarted = true;
  gamePaused = false;
  pendingResult = null;
  onlineActionSent = false;
  onlineFlushReceived = false;

  elements.app.classList.remove("is-paused");
  elements.mainMenu.hidden = true;
  elements.app.hidden = false;
  elements.restartBtn.hidden = true; // no restart in online mode

  // Show opponent name
  elements.onlineIndicator.hidden = false;
  elements.onlineIndicator.textContent =
    `🟢 对手：${getOnlineLocalActorId() === "player" ? "麦克老六" : "马大愣"}`;
  pickedChar = {
    id: data.selfCharacterId || pickedChar?.id || "zhang",
    name: data.self || pickedChar?.name || "我",
  };
  applyCharacterClasses();

  sound.preloadAll();
  sound.unlock();
  resetAnimationClasses();
  // Skip the 3-2-1 prep in online; go straight to selecting
  startOnlineCountdown();
  render();
}

function startOnlineCountdown() {
  if (!gameStarted || gamePaused) return;
  elements.burstText.classList.remove("prep-countdown");
  state.phase = "selecting";
  selectedActions = { player: null, ai: null };
  onlineActionSent = false;
  onlineFlushReceived = false;
  roundEndsAt = performance.now() + onlineTurnSeconds * 1000;
  lastTickAt = performance.now();
  lastCountdownBeat = null;
  resetAnimationClasses();
  render();
  updateOnlineTimerDisplay(onlineTurnSeconds * 1000);
  timerId = window.setInterval(tickOnlineTimer, 60);

  // Show the server-assigned role
  const myRoleLabel = onlineMySide === "attacker" ? "进攻方" : "防守方";
  elements.roundLabel.textContent =
    `第 ${state.round} 回合 · 你为${myRoleLabel}`;
  showBurstText(state.message);
}

function tickOnlineTimer() {
  if (gamePaused) return;
  const now = performance.now();
  const elapsedMs = now - lastTickAt;
  lastTickAt = now;
  state = reduceCooldowns(state, elapsedMs);
  renderStatus();
  renderOnlineButtons();
  updateOnlineTimerDisplay(roundEndsAt - now);

  if (roundEndsAt - now <= 0) {
    clearTimers();
    onOnlineTimerExpired();
  }
}

function updateOnlineTimerDisplay(remainingMs) {
  const remainingSeconds = Math.max(0, remainingMs / 1000);
  const countdownBeat = Math.ceil(remainingSeconds);
  elements.timer.textContent = remainingSeconds.toFixed(1);

  if (countdownBeat < 1 || countdownBeat > onlineTurnSeconds) return;
  if (countdownBeat === lastCountdownBeat) return;
  if (!settings.timerPop) return;

  lastCountdownBeat = countdownBeat;
  elements.timer.classList.remove("countdown-pop");
  void elements.timer.offsetWidth;
  elements.timer.classList.add("countdown-pop");
}

function onOnlineTimerExpired() {
  // Time's up. If we haven't sent an action, auto-submit fake_out.
  if (!onlineActionSent) {
    lockAllActionButtons();
    network.submitAction("fake_out");
    onlineActionSent = true;
    elements.choiceLabel.textContent = "倒计时结束，自动上报：啥也不干";
    sound.play("nothingHappens");
  }
  // Now we wait for TURN_FLUSH from server
  elements.choiceLabel.textContent =
    elements.choiceLabel.textContent || "等待服务器结算……";
}

function renderOnlineButtons() {
  const localActorId = getOnlineLocalActorId();
  const availability = getActionAvailability(state, localActorId);

  elements.actionButtons.forEach((button) => {
    const action = button.dataset.action;
    const actionAvailability = availability[action];
    const visible = Boolean(actionAvailability);
    const enabled = Boolean(actionAvailability?.enabled);
    button.hidden = false;
    button.setAttribute("aria-hidden", String(!visible));
    button.tabIndex = visible ? 0 : -1;
    button.classList.toggle("is-unavailable", !visible);
    // In online mode, disable buttons after we've sent our action
    const locked = onlineActionSent;
    button.disabled = state.phase !== "selecting" || !visible || !enabled || locked;
    button.classList.toggle("selected", selectedActions.player === action);
    button.classList.toggle("locked", (visible && !enabled) || locked);
    if (visible) {
      button.querySelector(".action-desc").textContent =
        actionAvailability.reason || ACTIONS[action].description;
    }
  });
}

function lockAllActionButtons() {
  elements.actionButtons.forEach((btn) => {
    btn.disabled = true;
    btn.classList.add("locked");
  });
}

function submitAction(actorId, actionId) {
  if (!["player", "ai"].includes(actorId) || state.phase !== "selecting") return false;
  const actingActorId = isOnlineMode ? getOnlineLocalActorId() : actorId;
  const availability = getActionAvailability(state, actingActorId);
  if (!availability[actionId]?.enabled) return false;

  // ---- Online mode ----
  if (isOnlineMode) {
    if (onlineActionSent) return false; // already submitted this turn
    submitOnlineAction(actionId);
    return true;
  }

  // ---- Single-player mode ----
  selectedActions = {
    ...selectedActions,
    [actorId]: actionId,
  };
  if (actorId === "player") {
    sound.play("dialogPop");
  }
  render();
  return true;
}

function submitOnlineAction(actionId) {
  selectedActions.player = actionId;
  onlineActionSent = true;
  network.submitAction(actionId);
  sound.play("dialogPop");
  renderOnlineButtons();
  elements.choiceLabel.textContent = "已选择，等待对手……";
  lockAllActionButtons();
}

function onTurnFlush(data) {
  if (!isOnlineMode || !gameStarted) return;
  onlineFlushReceived = true;
  clearTimers();

  const p1Action = data.actions.P1;
  const p2Action = data.actions.P2;
  const serverAttacker = data.attacker; // "P1" or "P2"

  // Map P1/P2 actions to player/ai based on my role
  const myRole = network.myRole; // "P1" or "P2"
  const myAction = myRole === "P1" ? p1Action : p2Action;
  const opponentAction = myRole === "P1" ? p2Action : p1Action;

  // The server tells us who is attacker this turn
  onlineMySide = (serverAttacker === myRole) ? "attacker" : "defender";
  onlineAttackerId = (serverAttacker === myRole) ? "player" : "ai";

  // Update state to match server's attacker assignment
  state.attackerId = onlineAttackerId;
  state.defenderId = onlineAttackerId === "player" ? "ai" : "player";

  // Prefer the server-authoritative result so both clients share one HP/winner state.
  const result = data.result
    ? data.result
    : resolveRound(state, myAction, opponentAction);
  result.playerAction = p1Action;
  result.aiAction = p2Action;
  result.effects = {
    ...result.effects,
    machineUsedByPlayer: p1Action === "back_throw",
    machineUsedByAi: p2Action === "back_throw",
  };

  // Sound: reveal + result
  playRevealSounds(result);
  setTimeout(() => playResultSounds(result), CONFIG.revealMs);

  state = {
    ...result.state,
    phase: result.state.winner ? "finished" : "revealing",
  };

  // Label update for online context
  elements.choiceLabel.textContent =
    `你：${ACTIONS[myAction].label}  |  对手：${ACTIONS[opponentAction].label}`;
  showBurstText("亮招！");
  applyActionAnimations(result);

  // Schedule result display
  scheduleResultTimeout(result, CONFIG.revealMs);

  // If game isn't over, schedule next turn
  if (!result.state.winner) {
    pendingResult = result;
    nextRoundTimeoutDeadline = performance.now() + CONFIG.revealMs + CONFIG.resultMs;
    nextRoundTimeoutId = window.setTimeout(() => {
      nextRoundTimeoutId = null;
      nextRoundTimeoutRemainingMs = null;
      pendingResult = null;
      if (!gameStarted || gamePaused) return;
      state = reduceCooldowns(result.nextState || result.state, performance.now() - lastTickAt);
      lastTickAt = performance.now();
      // The server manages role swap — so attacker/defender override comes from next TURN_FLUSH
      onlineMySide = getRoleForActor(state, getOnlineLocalActorId());
      onlineAttackerId = state.attackerId;
      // Reset for next turn
      onlineActionSent = false;
      onlineFlushReceived = false;
      selectedActions = { player: null, ai: null };
      resetAnimationClasses();
      startOnlineCountdown();
    }, CONFIG.revealMs + CONFIG.resultMs);
  } else {
    // Game over — show result but don't advance to next round
    renderOnlineResult(result);
  }
}

function mapServerResultToLocal(serverResult, myRole) {
  if (myRole === "P1") {
    return {
      ...serverResult,
      nextState: serverResult.nextState || null,
    };
  }

  const serverState = serverResult.state;
  const serverNextState = serverResult.nextState;
  return {
    ...serverResult,
    state: {
      ...serverState,
      attackerId: mapServerActorToLocal(serverState.attackerId, myRole),
      defenderId: mapServerActorToLocal(serverState.defenderId, myRole),
      player: serverState.ai,
      ai: serverState.player,
      winner: mapServerActorToLocal(serverState.winner, myRole),
    },
    nextState: serverNextState ? mapServerStateToLocal(serverNextState, myRole) : null,
    playerAction: serverResult.aiAction,
    aiAction: serverResult.playerAction,
    attackerId: mapServerActorToLocal(serverResult.attackerId, myRole),
    defenderId: mapServerActorToLocal(serverResult.defenderId, myRole),
    effects: swapPlayerAiEffects(serverResult.effects),
  };
}

function mapServerStateToLocal(serverState, myRole) {
  if (myRole === "P1") return serverState;
  return {
    ...serverState,
    attackerId: mapServerActorToLocal(serverState.attackerId, myRole),
    defenderId: mapServerActorToLocal(serverState.defenderId, myRole),
    player: serverState.ai,
    ai: serverState.player,
    winner: mapServerActorToLocal(serverState.winner, myRole),
  };
}

function getOnlinePlayerCharacter() {
  return "zhang";
}

function getOnlineOpponentCharacter() {
  return "michel";
}

function getCharacterIdFromName(name) {
  if (name?.includes("麦克") || name?.toLowerCase?.().includes("michel")) return "michel";
  if (name?.includes("张")) return "zhang";
  return null;
}

function getDisplayNames() {
  if (isOnlineMode) {
    return {
      player: "马大愣",
      ai: "麦克老六",
    };
  }

  return {
    player: "马大愣",
    ai: "麦克老六",
  };
}

function getOnlineLocalActorId() {
  return network.myRole === "P2" ? "ai" : "player";
}

function mapServerActorToLocal(actorId, myRole) {
  if (!actorId) return actorId;
  if (myRole === "P1") return actorId;
  if (actorId === "player") return "ai";
  if (actorId === "ai") return "player";
  return actorId;
}

function swapPlayerAiEffects(effects) {
  return {
    ...effects,
    playerHit: effects.aiHit,
    aiHit: effects.playerHit,
    playerDodged: effects.aiDodged,
    aiDodged: effects.playerDodged,
    playerWon: effects.aiWon,
    aiWon: effects.playerWon,
    machineUsedByPlayer: effects.machineUsedByAi,
    machineUsedByAi: effects.machineUsedByPlayer,
  };
}

function renderOnlineResult(result) {
  pendingResult = null;
  setTimeout(() => {
    if (!gameStarted || gamePaused) return;
    render();
    showEffectWord(getEffectWordForResult(result));
    applyHitAnimations(result.effects);
    applyFinishedSprites();
    pulseIfNeeded();
    elements.choiceLabel.textContent = "本局结束";
    elements.timer.textContent = "0.0";
  }, CONFIG.revealMs);
}

function endOnlineGame(reason) {
  isOnlineMode = false;
  onlineActionSent = false;
  onlineFlushReceived = false;
  clearTimers();
  clearScheduledRoundTimeouts();
  network.disconnect();
  gameStarted = false;
  gamePaused = false;
  pendingResult = null;
  state = createInitialState();
  elements.app.classList.remove("is-paused");
  elements.onlineIndicator.hidden = true;
  elements.restartBtn.hidden = false;
  elements.matchmakingOverlay.hidden = true;
  elements.charSelectScreen.hidden = true;
  pickedChar = null;
  resetAnimationClasses();
  alert(reason);
  renderMenu();
}

function renderMenu() {
  clearTimers();
  clearScheduledRoundTimeouts();

  // Clean up online state if returning from an online game
  if (isOnlineMode) {
    isOnlineMode = false;
    network.disconnect();
  }
  gameStarted = false;
  gamePaused = false;
  pendingResult = null;
  onlineActionSent = false;
  onlineFlushReceived = false;
  elements.app.classList.remove("is-paused");
  elements.mainMenu.hidden = false;
  elements.app.hidden = true;
  elements.onlineIndicator.hidden = true;
  elements.restartBtn.hidden = false;
  elements.matchmakingOverlay.hidden = true;
  elements.charSelectScreen.hidden = true;
  pickedChar = null;
  closeModals();
}

function startNewGame() {
  clearTimers();
  clearScheduledRoundTimeouts();
  state = createInitialState();
  selectedActions = { player: null, ai: null };
  gameStarted = true;
  gamePaused = false;
  pendingResult = null;
  elements.app.classList.remove("is-paused");
  elements.mainMenu.hidden = true;
  elements.app.hidden = false;
  sound.preloadAll();
  sound.unlock();
  resetAnimationClasses();
  startPrepCountdown();
}

function openModal(modalName) {
  const isHowToPlay = modalName === "howToPlay";
  elements.modalLayer.hidden = false;
  elements.howToPlayModal.hidden = !isHowToPlay;
  elements.settingsModal.hidden = isHowToPlay;
  elements.pauseModal.hidden = true;

  if (isHowToPlay) {
    howToPageIndex = 0;
    renderHowToPage();
  }
}

function closeModals() {
  elements.modalLayer.hidden = true;
  elements.howToPlayModal.hidden = true;
  elements.settingsModal.hidden = true;
  elements.pauseModal.hidden = true;
}

function renderHowToPage() {
  const page = HOW_TO_PAGES[howToPageIndex];
  elements.howToPlayImage.src = page.image;
  elements.howToPlayTitle.textContent = page.title;
  elements.howToPlayText.textContent = page.text;
  elements.howToPlayPageCount.textContent = `${howToPageIndex + 1} / ${HOW_TO_PAGES.length}`;
  elements.howToPrevBtn.disabled = howToPageIndex === 0;
  elements.howToNextBtn.disabled = howToPageIndex === HOW_TO_PAGES.length - 1;
}

function pauseGame() {
  if (!gameStarted || gamePaused) return;

  gamePaused = true;
  elements.app.classList.add("is-paused");
  pausedPrepRemainingMs = Math.max(0, prepEndsAt - performance.now());
  pausedRoundRemainingMs = Math.max(0, roundEndsAt - performance.now());
  resultTimeoutRemainingMs =
    resultTimeoutId === null ? null : Math.max(0, resultTimeoutDeadline - performance.now());
  nextRoundTimeoutRemainingMs =
    nextRoundTimeoutId === null ? null : Math.max(0, nextRoundTimeoutDeadline - performance.now());
  clearTimers();
  clearScheduledRoundTimeouts();
  elements.modalLayer.hidden = false;
  elements.howToPlayModal.hidden = true;
  elements.settingsModal.hidden = true;
  elements.pauseModal.hidden = false;
}

function resumeGame() {
  if (!gameStarted || !gamePaused) return;

  gamePaused = false;
  elements.app.classList.remove("is-paused");
  closeModals();
  lastTickAt = performance.now();

  if (state.phase === "selecting") {
    roundEndsAt = performance.now() + pausedRoundRemainingMs;
    timerId = window.setInterval(tickRoundTimer, 60);
    render();
  }

  if (state.phase === "preparing") {
    prepEndsAt = performance.now() + pausedPrepRemainingMs;
    prepTimerId = window.setInterval(tickPrepCountdown, 60);
    updatePrepCountdown(prepEndsAt - performance.now());
  }

  if (pendingResult && resultTimeoutRemainingMs !== null) {
    scheduleResultTimeout(pendingResult, resultTimeoutRemainingMs);
  }

  if (pendingResult && nextRoundTimeoutRemainingMs !== null) {
    scheduleNextRoundTimeout(pendingResult, nextRoundTimeoutRemainingMs);
  }

  resultTimeoutRemainingMs = null;
  nextRoundTimeoutRemainingMs = null;
}

function startRound() {
  if (!gameStarted || gamePaused) return;
  elements.burstText.classList.remove("prep-countdown");
  state.phase = "selecting";
  selectedActions = { player: null, ai: null };
  roundEndsAt = performance.now() + CONFIG.roundSeconds * 1000;
  lastTickAt = performance.now();
  lastCountdownBeat = null;
  resetAnimationClasses();
  render();
  updateTimerDisplay(CONFIG.roundSeconds * 1000);
  timerId = window.setInterval(tickRoundTimer, 60);
}

function startPrepCountdown() {
  if (!gameStarted || gamePaused) return;
  clearTimers();
  state.phase = "preparing";
  selectedActions = { player: null, ai: null };
  prepEndsAt = performance.now() + 3000;
  lastPrepCountdownBeat = null;
  resetAnimationClasses();
  render();
  updatePrepCountdown(3000);
  prepTimerId = window.setInterval(tickPrepCountdown, 60);
}

function tickPrepCountdown() {
  if (gamePaused) return;
  const remainingMs = prepEndsAt - performance.now();
  updatePrepCountdown(remainingMs);

  if (remainingMs <= 0) {
    clearPrepTimer();
    startRound();
  }
}

function scheduleResultTimeout(result, delayMs) {
  pendingResult = result;
  resultTimeoutDeadline = performance.now() + delayMs;
  resultTimeoutId = window.setTimeout(() => {
    resultTimeoutId = null;
    resultTimeoutRemainingMs = null;
    if (gameStarted && !gamePaused) renderResult(result);
  }, delayMs);
}

function scheduleNextRoundTimeout(result, delayMs) {
  pendingResult = result;
  nextRoundTimeoutDeadline = performance.now() + delayMs;
  nextRoundTimeoutId = window.setTimeout(() => {
    nextRoundTimeoutId = null;
    nextRoundTimeoutRemainingMs = null;
    pendingResult = null;
    if (!gameStarted || gamePaused) return;
    state = reduceCooldowns(result.state, performance.now() - lastTickAt);
    lastTickAt = performance.now();
    state = beginNextRound(state);
    startRound();
  }, delayMs);
}

function tickRoundTimer() {
  if (gamePaused) return;
  const now = performance.now();
  const elapsedMs = now - lastTickAt;
  lastTickAt = now;
  const prevPlayerCd = state.player.backThrowCooldownMs;
  const prevAiCd = state.ai.backThrowCooldownMs;
  state = reduceCooldowns(state, elapsedMs);
  if (prevPlayerCd > 0 && state.player.backThrowCooldownMs === 0) {
    sound.play("cooldownEnd");
  }
  if (prevAiCd > 0 && state.ai.backThrowCooldownMs === 0) {
    sound.play("cooldownEnd");
  }
  renderStatus();
  renderButtons();
  updateTimerDisplay(roundEndsAt - now);

  if (roundEndsAt - now <= 0) {
    clearTimers();
    playRound();
  }
}

function playRound() {
  if (!gameStarted || gamePaused) return;
  // Online mode uses server-mediated TURN_FLUSH — never play locally
  if (isOnlineMode) return;
  state = reduceCooldowns(state, performance.now() - lastTickAt);
  lastTickAt = performance.now();

  const playerAction = selectedActions.player;
  const aiAction = selectedActions.ai ?? chooseAiAction(state, "normal");
  const result = resolveRound(state, playerAction, aiAction);

  // Sound: reveal phase — action animations
  playRevealSounds(result);

  // Sound: result phase — hit / block / dodge / gauge / victory
  setTimeout(() => playResultSounds(result), CONFIG.revealMs);

  state = {
    ...result.state,
    phase: result.state.winner ? "finished" : "revealing",
  };

  renderReveal(result);
  scheduleResultTimeout(result, CONFIG.revealMs);

  if (!result.state.winner) {
    scheduleNextRoundTimeout(result, CONFIG.revealMs + CONFIG.resultMs);
  }
}

function playRevealSounds(result) {
  const playerAction = result.playerAction;
  const aiAction = result.aiAction;

  // Player action sounds
  playActionSound(playerAction, 0);
  // AI action sounds with slight stagger
  playActionSound(aiAction, 80);

  // Machine lever + projectile fly sounds
  if (result.effects.machineUsedByPlayer || result.effects.machineUsedByAi) {
    sound.play("machineLever", 50);
    sound.play("projectileFly", 320);
  }
}

function playActionSound(action, delay) {
  switch (action) {
    case "front_punch":
      sound.play("punchSwing", delay);
      break;
    case "back_throw":
      // Machine sound handled separately in playRevealSounds
      break;
    case "double_punch":
      sound.play("doublePunch", delay);
      break;
    case "fake_out":
      sound.play("nothingHappens", delay);
      break;
    case "guard_front":
      sound.play("wait", delay);
      break;
    case "look_back":
      sound.play("lookBack", delay);
      break;
  }
}

function playResultSounds(result) {
  const { events, effects, state: newState } = result;

  // Event-driven result sounds
  for (const event of events) {
    switch (event.type) {
      case "frontPunchHit":
        sound.play("punchHit");
        sound.play("gotHit", 70);
        sound.play("hpDecrease", 140);
        break;
      case "frontBlocked":
        sound.play("fistsCollide");
        break;
      case "backThrowHit":
        sound.play("projectileHit");
        sound.play("hitFromBehind", 50);
        sound.play("gotHit", 90);
        sound.play("hpDecrease", 180);
        break;
      case "backThrowBlocked":
        sound.play("dodge");
        break;
      case "doublePunchHit":
        sound.play("gotHit", 80);
        sound.play("hpDecrease", 160);
        sound.play("stagger", 280);
        break;
      case "fakeLookBack":
        // Played during reveal; brief acknowledgment
        sound.play("energyPlus", 200);
        break;
      case "fakeGuardFront":
        break;
    }
  }

  // Machine cooldown start
  if (effects.machineUsedByPlayer || effects.machineUsedByAi) {
    sound.play("cooldownStart", 480);
  }

  // Gauge changes — check the latest history entry
  const historyEntry = newState.history[newState.history.length - 1];
  if (historyEntry) {
    const playerIsAttacker = result.attackerId === "player";
    const playerGaugeDelta = playerIsAttacker
      ? historyEntry.surpriseDelta.attacker
      : historyEntry.surpriseDelta.defender;

    if (playerGaugeDelta > 0) {
      if (newState.player.gauge >= 3) {
        sound.play("energyFull", 350);
      } else {
        sound.play("energyPlus", 250);
      }
    }

    // Gauge spent (double punch)
    const playerSpentGauge =
      (result.attackerId === "player" && result.attackAction === "double_punch") ||
      (result.defenderId === "player" && result.defendAction === "double_punch");
    if (playerSpentGauge) {
      sound.play("energyEmpty", 450);
    }
  }

  // Victory / Defeat fanfare
  if (newState.winner === "player") {
    sound.play("victory", 550);
  } else if (newState.winner === "ai") {
    sound.play("defeat", 550);
  }
}

function renderReveal(result) {
  render();
  elements.choiceLabel.textContent = `你：${ACTIONS[result.playerAction].label} / AI：${ACTIONS[result.aiAction].label}`;
  showBurstText("亮招！");
  applyActionAnimations(result);
}

function renderResult(result) {
  render();
  showEffectWord(getEffectWordForResult(result));
  applyHitAnimations(result.effects);
  applyFinishedSprites();
  pulseIfNeeded();
}

function render() {
  renderStatus();
  renderFighterNames();
  // In online mode, buttons are rendered by renderOnlineButtons which handles lock state
  if (isOnlineMode) {
    renderOnlineButtons();
  } else {
    renderButtons();
  }

  const localActorId = isOnlineMode ? getOnlineLocalActorId() : "player";
  elements.roundLabel.textContent =
    state.attackerId === localActorId ? `第 ${state.round} 回合 · 轮到你出手` : `第 ${state.round} 回合 · 对方要出手了`;

  if (state.phase === "selecting") {
    elements.choiceLabel.textContent = selectedActions.player
      ? `已选择：${ACTIONS[selectedActions.player].label}`
      : state.attackerId === localActorId
        ? "请选择进攻行动"
        : "请选择防守行动";
    showBurstText(state.message);
  }

  if (state.phase === "preparing") {
    elements.roundLabel.textContent = `第 ${state.round} 回合 · 准备`;
    elements.choiceLabel.textContent = "准备开始";
  }

  if (state.phase === "finished") {
    elements.choiceLabel.textContent = "本局结束";
    elements.timer.textContent = "0.0";
  }
}

function renderStatus() {
  renderFighterNames();
  elements.aiHp.innerHTML = renderHearts(state.ai.hp);
  elements.playerHp.innerHTML = renderHearts(state.player.hp);
  elements.aiGauge.textContent = `${formatRole("ai")} · 心眼值 ${state.ai.gauge}/${CONFIG.maxGauge}`;
  elements.playerGauge.textContent = `${formatRole("player")} · 心眼值 ${state.player.gauge}/${CONFIG.maxGauge}`;
  elements.aiCooldown.textContent = formatCooldown(state.ai);
  elements.playerCooldown.textContent = formatCooldown(state.player);
  elements.aiCooldown.classList.toggle("cooldown-hot", isCooldownHot(state.ai));
  elements.playerCooldown.classList.toggle("cooldown-hot", isCooldownHot(state.player));
}

function renderFighterNames() {
  const names = getDisplayNames();
  const playerNameEl = document.querySelector(".status-player .status-name");
  const aiNameEl = document.querySelector(".status-ai .status-name");
  if (playerNameEl) playerNameEl.textContent = names.player;
  if (aiNameEl) aiNameEl.textContent = names.ai;
}

function renderButtons() {
  const availability = getActionAvailability(state, "player");

  elements.actionButtons.forEach((button) => {
    const action = button.dataset.action;
    const actionAvailability = availability[action];
    const visible = Boolean(actionAvailability);
    const enabled = Boolean(actionAvailability?.enabled);
    button.hidden = false;
    button.setAttribute("aria-hidden", String(!visible));
    button.tabIndex = visible ? 0 : -1;
    button.classList.toggle("is-unavailable", !visible);
    button.disabled = state.phase !== "selecting" || !visible || !enabled;
    button.classList.toggle("selected", selectedActions.player === action);
    button.classList.toggle("locked", visible && !enabled);
    if (visible) {
      button.querySelector(".action-desc").textContent =
        actionAvailability.reason || ACTIONS[action].description;
    }
  });
}

function renderHearts(hp) {
  return Array.from({ length: CONFIG.maxHp }, (_, index) =>
    index < hp ? '<span class="heart full"></span>' : '<span class="heart"></span>',
  ).join("");
}

function formatCooldown(fighter) {
  if (fighter.backThrowCooldownMs > 0) return `铁块 ${Math.ceil(fighter.backThrowCooldownMs / 1000)}s`;
  return "铁块 OK";
}

function applyActionAnimations(result) {
  resetAnimationClasses();
  elements.playerFighter.classList.add(`act-${result.playerAction}`);
  elements.aiFighter.classList.add(`act-${result.aiAction}`);

  if (result.effects.machineUsedByPlayer) elements.projectile.classList.add("from-player");
  if (result.effects.machineUsedByAi) elements.projectile.classList.add("from-ai");
}

function applyHitAnimations(effects) {
  if (effects.playerHit) elements.playerFighter.classList.add("is-hit");
  if (effects.aiHit) elements.aiFighter.classList.add("is-hit");
  if (effects.playerDodged) elements.playerFighter.classList.add("is-dodging");
  if (effects.aiDodged) elements.aiFighter.classList.add("is-dodging");
}

function pulseIfNeeded() {
  if (!settings.screenShake) return;
  elements.arena.classList.remove("screen-shake");
  void elements.arena.offsetWidth;
  elements.arena.classList.add("screen-shake");
}

function resetAnimationClasses() {
  const actionClasses = Object.keys(ACTIONS).map((action) => `act-${action}`);
  elements.playerFighter.className = "fighter fighter-player";
  elements.aiFighter.className = "fighter fighter-ai";
  elements.projectile.className = "projectile";
  elements.arena.classList.remove("screen-shake");
  actionClasses.forEach((className) => {
    elements.playerFighter.classList.remove(className);
    elements.aiFighter.classList.remove(className);
  });
  applyCharacterClasses();
}

function applyCharacterClasses() {
  elements.playerFighter.classList.remove("char-zhang", "char-michel");
  elements.aiFighter.classList.remove("char-zhang", "char-michel");

  if (isOnlineMode) {
    elements.playerFighter.classList.add(`char-${getOnlinePlayerCharacter()}`);
    elements.aiFighter.classList.add(`char-${getOnlineOpponentCharacter()}`);
  }
}

function applyFinishedSprites() {
  if (!state.winner) return;
  elements.playerFighter.classList.add(state.winner === "player" ? "is-winning" : "is-losing");
  elements.aiFighter.classList.add(state.winner === "ai" ? "is-winning" : "is-losing");
}

function clearTimers() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
  clearPrepTimer();
}

function clearPrepTimer() {
  if (prepTimerId) window.clearInterval(prepTimerId);
  prepTimerId = null;
}

function clearScheduledRoundTimeouts() {
  if (resultTimeoutId !== null) window.clearTimeout(resultTimeoutId);
  if (nextRoundTimeoutId !== null) window.clearTimeout(nextRoundTimeoutId);
  resultTimeoutId = null;
  nextRoundTimeoutId = null;
}

function updateTimerDisplay(remainingMs) {
  const remainingSeconds = Math.max(0, remainingMs / 1000);
  const countdownBeat = Math.ceil(remainingSeconds);
  elements.timer.textContent = remainingSeconds.toFixed(1);

  if (countdownBeat < 1 || countdownBeat > CONFIG.roundSeconds) return;
  if (countdownBeat === lastCountdownBeat) return;
  if (!settings.timerPop) return;

  lastCountdownBeat = countdownBeat;
  elements.timer.classList.remove("countdown-pop");
  void elements.timer.offsetWidth;
  elements.timer.classList.add("countdown-pop");
}

function updatePrepCountdown(remainingMs) {
  const countdownBeat = Math.ceil(Math.max(0, remainingMs) / 1000);
  const label = countdownBeat > 0 ? String(countdownBeat) : "开始";
  elements.timer.textContent = countdownBeat > 0 ? label : "0";
  showBurstText(label);
  elements.burstText.classList.add("prep-countdown");

  if (countdownBeat > 0 && countdownBeat <= 3 && countdownBeat !== lastPrepCountdownBeat) {
    if (countdownBeat === 1) {
      sound.play("hpDecrease");
    } else {
      sound.play("energyPlus");
    }
  }

  if (countdownBeat < 1 || countdownBeat > 3) return;
  if (countdownBeat === lastPrepCountdownBeat) return;
  lastPrepCountdownBeat = countdownBeat;
  elements.timer.classList.remove("countdown-pop");
  elements.burstText.classList.remove("countdown-pop");
  void elements.timer.offsetWidth;
  elements.timer.classList.add("countdown-pop");
  elements.burstText.classList.add("countdown-pop");
}

function showBurstText(text) {
  elements.burstText.classList.remove("effect-word");
  elements.burstText.style.backgroundImage = "";
  elements.burstText.textContent = text;
}

function showEffectWord(imageUrl) {
  elements.burstText.textContent = "";
  elements.burstText.classList.remove("prep-countdown");
  elements.burstText.classList.add("effect-word");
  elements.burstText.style.backgroundImage = `url("${imageUrl}")`;
}

function getEffectWordForResult(result) {
  if (result.state.winner === "player") return EFFECT_WORDS.playerWin;
  if (result.state.winner === "ai") return EFFECT_WORDS.playerLose;
  return EFFECT_WORDS[result.events[0]?.type] || EFFECT_WORDS.fakeGuardFront;
}

function installGameInterface() {
  window.ColdBangBangGame = {
    submitAction,
    getSnapshot: () => JSON.parse(JSON.stringify(toPublicState())),
    getLegalActions: (actorId = "player") => getLegalActions(state, actorId),
    // Online mode
    get isOnline() { return isOnlineMode; },
    get opponentName() { return network.opponentName; },
    startOnlineMatch,
    cancelOnlineMatch,
  };
}

function toPublicState() {
  return {
    round: state.round,
    phase: state.phase,
    attackerId: state.attackerId,
    defenderId: state.defenderId,
    player: state.player,
    ai: state.ai,
    winner: state.winner,
    history: state.history,
  };
}

function formatRole(actorId) {
  return getRoleForActor(state, actorId) === "attacker" ? "进攻" : "防守";
}

function isCooldownHot(fighter) {
  return fighter.backThrowCooldownMs > 0 && fighter.backThrowCooldownMs <= CONFIG.cooldownEmphasisMs;
}
