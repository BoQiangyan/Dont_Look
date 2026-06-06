// server.js - 冷不丁：背后梆梆拳 联网双人对战裁判服务器
// 职责：匹配玩家、收集双方行动、倒计时保底、帧对齐广播 TURN_FLUSH
// 不运行游戏规则 — 规则结算由各客户端本地运行 rules.js

import { WebSocketServer } from "ws";
import { beginNextRound, createInitialState, reduceCooldowns } from "./src/state.js";
import { resolveRound } from "./src/rules.js";

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 5188);
const TURN_SECONDS = Number(process.env.TURN_SECONDS || 30);

let roomIdCounter = 1;
let waitingPlayer = null;

const rooms = new Map();

const wss = new WebSocketServer({ host: HOST, port: PORT });

wss.on("listening", () => {
  console.log(`[服务器] 运行在 ws://${HOST}:${PORT}/ (局域网用: ws://<本机IP>:${PORT}/)`);
  console.log(`[服务器] 回合倒计时: ${TURN_SECONDS} 秒`);
});

wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress || "unknown";
  console.log(`[连接] 新客户端 ${clientIp}`);

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "ERROR", message: "格式错误，需要 JSON" }));
      return;
    }
    handleMessage(ws, data);
  });

  ws.on("close", () => handleDisconnect(ws));
  ws.on("error", () => handleDisconnect(ws));
});

function handleMessage(ws, data) {
  switch (data.type) {
    case "JOIN_QUEUE":
      handleJoinQueue(ws, data);
      break;

    case "SUBMIT_ACTION":
      handleSubmitAction(ws, data);
      break;

    case "LEAVE_QUEUE":
      if (waitingPlayer && waitingPlayer.ws === ws) {
        waitingPlayer = null;
        ws.send(JSON.stringify({ type: "LEFT_QUEUE" }));
        console.log("[队列] 玩家取消匹配");
      }
      break;

    case "SURRENDER":
      handleSurrender(ws);
      break;

    default:
      ws.send(JSON.stringify({ type: "ERROR", message: `未知消息类型: ${data.type}` }));
  }
}

function handleJoinQueue(ws, data) {
  const name = (data.name || "拳手").slice(0, 8);
  const characterId = normalizeCharacterId(data.characterId, name);

  // 如果已经在房间中，不允许重新排队
  if (ws.roomId != null && rooms.has(ws.roomId)) {
    ws.send(JSON.stringify({ type: "ERROR", message: "你已经在战斗中了" }));
    return;
  }

  if (waitingPlayer && waitingPlayer.ws !== ws && waitingPlayer.ws.readyState === ws.OPEN) {
    // 配对成功
    const incomingPlayer = { ws, name, characterId };
    const pair = assignWorldRoles(waitingPlayer, incomingPlayer);
    const p1 = pair.P1;
    const p2 = pair.P2;

    const roomId = roomIdCounter++;
    const room = {
      id: roomId,
      P1: p1,
      P2: p2,
      turnActions: { P1: null, P2: null },
      timer: null,
      turnDurationMs: TURN_SECONDS * 1000,
      gameState: createInitialState(),
      lastTurnStartedAt: Date.now(),
      currentAttacker: "P1", // P1 第一回合进攻
      currentDefender: "P2",
      turnNumber: 1,
      round: 1,
    };

    rooms.set(roomId, room);
    p1.ws.roomId = roomId;
    p2.ws.roomId = roomId;

    // P1 = 进攻方, P2 = 防守方
    p1.ws.send(
      JSON.stringify({
        type: "MATCHED",
        role: "P1",
        side: "attacker",
        self: p1.name,
        selfCharacterId: p1.characterId,
        opponent: p2.name,
        opponentCharacterId: p2.characterId,
        roomId,
        turnSeconds: TURN_SECONDS,
      }),
    );
    p2.ws.send(
      JSON.stringify({
        type: "MATCHED",
        role: "P2",
        side: "defender",
        self: p2.name,
        selfCharacterId: p2.characterId,
        opponent: p1.name,
        opponentCharacterId: p1.characterId,
        roomId,
        turnSeconds: TURN_SECONDS,
      }),
    );

    waitingPlayer = null;
    console.log(`[房间 ${roomId}] 匹配成功 P1="${p1.name}" vs P2="${p2.name}"，开始第 1 回合计时`);

    startRoomTimer(room);
  } else {
    // 进入等待队列
    waitingPlayer = { ws, name, characterId };
    ws.send(JSON.stringify({ type: "WAITING", message: "正在寻找对手……" }));
    console.log(`[队列] "${name}" 进入等待`);
  }
}

function normalizeCharacterId(characterId, name = "") {
  if (characterId === "michel" || characterId === "zhang") return characterId;
  if (name.includes("麦克") || name.toLowerCase().includes("michel")) return "michel";
  return "zhang";
}

function assignWorldRoles(a, b) {
  if (a.characterId === "zhang" && b.characterId === "michel") return { P1: a, P2: b };
  if (a.characterId === "michel" && b.characterId === "zhang") return { P1: b, P2: a };
  return { P1: a, P2: b };
}

function handleSubmitAction(ws, data) {
  const roomId = ws.roomId;
  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "ERROR", message: "你不在任何房间中" }));
    return;
  }

  const role = room.P1.ws === ws ? "P1" : "P2";

  // 只接受本回合首次提交
  if (room.turnActions[role] !== null) {
    ws.send(JSON.stringify({ type: "ERROR", message: "本回合已提交过行动" }));
    return;
  }

  room.turnActions[role] = data.action;
  console.log(`[房间 ${roomId}] ${role}="[${room[role].name}]" 提交: ${data.action}`);

  // 告知该玩家行动已确认
  ws.send(JSON.stringify({ type: "ACTION_CONFIRMED", action: data.action }));

  // 告知对手"对方已选择"
  const opponentRole = role === "P1" ? "P2" : "P1";
  const opponentWs = room[opponentRole].ws;
  if (opponentWs.readyState === ws.OPEN) {
    opponentWs.send(JSON.stringify({ type: "OPPONENT_SELECTED" }));
  }

  // 双方都提交了 → 提前结算
  checkAndFlushTurn(room);
}

function startRoomTimer(room) {
  if (room.timer) clearTimeout(room.timer);

  room.timer = setTimeout(() => {
    console.log(`[房间 ${room.id}] 倒计时结束！超时保底结算。`);

    // 谁没选，默认 'fake_out'
    if (room.turnActions.P1 === null) {
      room.turnActions.P1 = "fake_out";
      console.log(`[房间 ${room.id}] P1 超时 → fake_out`);
    }
    if (room.turnActions.P2 === null) {
      room.turnActions.P2 = "fake_out";
      console.log(`[房间 ${room.id}] P2 超时 → fake_out`);
    }

    flushTurn(room);
  }, room.turnDurationMs);
}

function checkAndFlushTurn(room) {
  if (room.turnActions.P1 !== null && room.turnActions.P2 !== null) {
    if (room.timer) clearTimeout(room.timer);
    flushTurn(room);
  }
}

function flushTurn(room) {
  const elapsedMs = Date.now() - room.lastTurnStartedAt;
  const settledState = reduceCooldowns(room.gameState, elapsedMs);
  const result = resolveRound(settledState, room.turnActions.P1, room.turnActions.P2);
  const nextState = result.state.winner ? result.state : beginNextRound(result.state);

  const payload = {
    type: "TURN_FLUSH",
    actions: {
      P1: room.turnActions.P1,
      P2: room.turnActions.P2,
    },
    // 告知当前回合的攻防身份
    attacker: room.currentAttacker,
    defender: room.currentDefender,
    turnNumber: room.turnNumber,
    players: {
      P1: { name: room.P1.name, characterId: room.P1.characterId },
      P2: { name: room.P2.name, characterId: room.P2.characterId },
    },
    result: {
      state: result.state,
      nextState,
      playerAction: result.playerAction,
      aiAction: result.aiAction,
      attackAction: result.attackAction,
      defendAction: result.defendAction,
      attackerId: result.attackerId,
      defenderId: result.defenderId,
      events: result.events,
      effects: result.effects,
    },
  };

  sendToRoom(room, payload);
  console.log(
    `[房间 ${room.id}] 第 ${room.turnNumber} 回合结算 → P1:${room.turnActions.P1}  P2:${room.turnActions.P2}`,
  );

  // 清空本回合缓冲区
  room.turnActions = { P1: null, P2: null };

  // 攻防交换
  const tmp = room.currentAttacker;
  room.currentAttacker = room.currentDefender;
  room.currentDefender = tmp;
  room.turnNumber++;

  // 每隔一次攻防交换才算一个完整回合（进攻+防守各一次 = 1 round）
  if (room.turnNumber % 2 === 0) {
    room.round++;
  }

  room.gameState = nextState;
  room.lastTurnStartedAt = Date.now();

  // 开启下一回合倒计时
  if (!result.state.winner) startRoomTimer(room);
}

function handleSurrender(ws) {
  const roomId = ws.roomId;
  const room = rooms.get(roomId);
  if (!room) return;

  const role = room.P1.ws === ws ? "P1" : "P2";
  const opponentRole = role === "P1" ? "P2" : "P1";
  const opponentWs = room[opponentRole].ws;

  if (opponentWs.readyState === ws.OPEN) {
    opponentWs.send(JSON.stringify({ type: "OPPONENT_SURRENDERED" }));
  }
  console.log(`[房间 ${roomId}] ${role} 投降`);

  destroyRoom(roomId);
}

function handleDisconnect(ws) {
  // 如果断连的是等待中的玩家
  if (waitingPlayer && waitingPlayer.ws === ws) {
    waitingPlayer = null;
    console.log("[队列] 等待中的玩家断连");
  }

  const roomId = ws.roomId;
  if (roomId == null) return;

  const room = rooms.get(roomId);
  if (!room) return;

  const role = room.P1.ws === ws ? "P1" : "P2";
  const opponentRole = role === "P1" ? "P2" : "P1";
  const opponentWs = room[opponentRole].ws;

  if (opponentWs.readyState === ws.OPEN) {
    opponentWs.send(JSON.stringify({ type: "OPPONENT_DISCONNECTED" }));
  }

  console.log(`[房间 ${roomId}] ${role} 断连，房间销毁`);
  destroyRoom(roomId);
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.timer) clearTimeout(room.timer);

  try { room.P1.ws.roomId = null; } catch (_) {}
  try { room.P2.ws.roomId = null; } catch (_) {}

  rooms.delete(roomId);
}

function sendToRoom(room, payload) {
  const raw = JSON.stringify(payload);
  [room.P1, room.P2].forEach((player) => {
    try {
      if (player.ws.readyState === player.ws.OPEN) player.ws.send(raw);
    } catch (_) {}
  });
}

// 优雅退出
process.on("SIGINT", () => {
  console.log("\n[服务器] 正在关闭……");
  for (const [id, room] of rooms) {
    if (room.timer) clearTimeout(room.timer);
    sendToRoom(room, { type: "SERVER_SHUTDOWN" });
    rooms.delete(id);
  }
  wss.close();
  process.exit(0);
});
