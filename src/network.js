// network.js - 联网对战 WebSocket 客户端
// 连接到 node server.js，处理匹配、提交、TURN_FLUSH 接收
// 不包含任何 UI 或游戏规则逻辑 — 只做消息收发和状态管理

const DEFAULT_SERVER = `ws://${location.hostname}:5188`;

class NetworkClient {
  constructor() {
    this.ws = null;
    this._listeners = {};
    this.connected = false;
    this.roomId = null;
    this.myRole = null;       // "P1" | "P2"
    this.opponentName = "";
    this.opponentCharacterId = "";
    this.myName = "";
    this.myCharacterId = "";
    this.inQueue = false;
    this.actionConfirmed = false;
    this.opponentSelected = false;
  }

  // --- Connection ---

  connect(serverUrl) {
    const url = serverUrl || DEFAULT_SERVER;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this._emit("connected");
    };

    this.ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      this._dispatch(data);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.roomId = null;
      this.inQueue = false;
      this._emit("disconnected");
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  disconnect() {
    this.connected = false;
    this.inQueue = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // --- Outgoing ---

  joinQueue(profile) {
    const normalizedProfile = typeof profile === "string" ? { name: profile } : profile;
    this.myName = normalizedProfile.name;
    this.myCharacterId = normalizedProfile.characterId || "";
    this.inQueue = true;
    this._send({ type: "JOIN_QUEUE", ...normalizedProfile });
  }

  leaveQueue() {
    this.inQueue = false;
    this._send({ type: "LEAVE_QUEUE" });
  }

  submitAction(action) {
    this.actionConfirmed = false;
    this.opponentSelected = false;
    this._send({ type: "SUBMIT_ACTION", action });
  }

  surrender() {
    this._send({ type: "SURRENDER" });
  }

  // --- Incoming dispatch ---

  _dispatch(data) {
    switch (data.type) {
      case "WAITING":
        this._emit("waiting", data);
        break;

      case "MATCHED":
        this.myRole = data.role;
        this.opponentName = data.opponent;
        this.opponentCharacterId = data.opponentCharacterId || "";
        this.myName = data.self || this.myName;
        this.myCharacterId = data.selfCharacterId || this.myCharacterId;
        this.roomId = data.roomId;
        this.inQueue = false;
        this._emit("matched", data);
        break;

      case "ACTION_CONFIRMED":
        this.actionConfirmed = true;
        this._emit("actionConfirmed", data);
        break;

      case "OPPONENT_SELECTED":
        this.opponentSelected = true;
        this._emit("opponentSelected", data);
        break;

      case "TURN_FLUSH":
        this.actionConfirmed = false;
        this.opponentSelected = false;
        this._emit("turnFlush", data);
        break;

      case "OPPONENT_DISCONNECTED":
        this._emit("opponentDisconnected", data);
        break;

      case "OPPONENT_SURRENDERED":
        this._emit("opponentSurrendered", data);
        break;

      case "LEFT_QUEUE":
        this.inQueue = false;
        this._emit("leftQueue", data);
        break;

      case "SERVER_SHUTDOWN":
        this._emit("serverShutdown", data);
        break;

      case "ERROR":
        this._emit("error", data);
        break;
    }
  }

  // --- Event system ---

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this._listeners[event];
    if (!list) return;
    this._listeners[event] = list.filter((f) => f !== fn);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach((fn) => {
      try { fn(data); } catch (_) {}
    });
  }

  // --- Helpers ---

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  get isInMatch() {
    return this.roomId != null && this.connected && this.myRole != null;
  }
}

export const network = new NetworkClient();
