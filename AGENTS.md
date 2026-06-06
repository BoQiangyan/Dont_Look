# AGENTS.md

本文件是《冷不丁：背后梆梆拳》项目交接说明。另一台电脑或另一个 Codex/agent 打开项目时，优先读本文件，再读 `README.md` 和 `docs/`。

## 项目定位

《冷不丁：背后梆梆拳》是一款轻量 H5/WebView 像素街机风回合制小游戏。

- 玩家操控：马大愣
- AI 对手：米歇尔
- 核心卖点：喜剧化的“你到底回不回头”心理博弈
- 当前目标：单机可试玩 MVP，不做联网、账号、排行榜、多角色、多关卡

## 当前核心机制

游戏已经从早期“双方同时五选一”改为“攻防轮换制”。

每个小回合只有一方进攻，另一方防守，回合结束后交换身份。

进攻方行动：

| action id | 显示名 | 作用 |
| --- | --- | --- |
| `front_punch` | 冷不丁一拳 | 正面攻击，打猛回头的人 |
| `back_throw` | 投掷铁块 | 背后攻击，砸就不回头的人 |
| `fake_out` | 啥也不干 | 骗招，不直接伤害，攒冷不丁值 |
| `double_punch` | 冷不丁梆梆两拳 | 冷不丁值满 3 后可用，不能被完全防住 |

防守方行动：

| action id | 显示名 | 作用 |
| --- | --- | --- |
| `guard_front` | 就不回头 | 防正面拳 |
| `look_back` | 猛回头 | 防背后铁块 |

基础数值：

- 初始血量：5
- 冷不丁值上限：3
- 冷不丁一拳伤害：1
- 投掷铁块伤害：2
- 冷不丁梆梆两拳伤害：2
- 猛回头防冷不丁梆梆两拳后伤害：1
- 投掷铁块冷却：10 秒
- 冷却倒计时仅在剩余 3 秒内重点显示
- 每回合选择时间：3 秒

结算矩阵：

| 进攻方 | 防守方就不回头 | 防守方猛回头 |
| --- | --- | --- |
| 冷不丁一拳 | 被防住，0 伤害 | 命中，1 伤害，进攻方 +1 冷不丁 |
| 投掷铁块 | 命中，2 伤害，进攻方 +1 冷不丁 | 被防住，0 伤害，防守方 +1 冷不丁 |
| 啥也不干 | 0 伤害，进攻方 +1 冷不丁 | 0 伤害，进攻方 +2 冷不丁 |
| 冷不丁梆梆两拳 | 2 伤害，进攻方冷不丁清零 | 1 伤害，进攻方冷不丁清零 |

## 当前实现进度

已完成：

- 基础页面：`project/index.html`
- 主流程和渲染：`project/src/main.js`
- 状态管理：`project/src/state.js`
- 规则结算：`project/src/rules.js`
- AI 决策：`project/src/ai.js`
- 数值和行动配置：`project/src/constants.js`
- 样式和动画：`project/src/styles.css`
- 规则校验脚本：`project/scripts/check-rules.mjs`
- 攻防轮换机制接入
- 玩家进攻/防守时按身份显示不同按钮
- 3 秒开局准备倒计时和每回合选择倒计时
- 主菜单、游戏说明弹窗、设置弹窗、暂停/返回主界面
- 主菜单背景已替换为去掉按钮的整张 UI 背景
- 主菜单三个按钮已替换为独立 PNG 素材
- 战斗结算效果词已接入 PNG 素材，不再只显示纯文字
- 游戏说明弹窗为 5 页图文翻页，使用正式重绘版说明图

当前未完成/待优化：

- 本地浏览器预览截图验收尚未完成；上一次启动预览服务时沙箱授权超时
- 说明页图片已经接入，但后续仍可继续人工精修
- 主菜单按钮位置已按参考图比例排版，但最好在真实手机比例上再微调一次
- 效果词位置放在战斗舞台上方偏中，已尽量避开角色；后续应在不同屏幕尺寸上验证
- 暂无音效和背景音乐
- 暂无开始/胜负结算专门页面，当前胜负表现仍在战斗界面内
- 暂无联网对战

## 目录结构

```text
cold-bangbang-sync-package-2026-05-30/
  AGENTS.md
  README.md
  docs/
    冷不丁-游戏开发需求文档.md
    冷不丁-攻防回合制机制设计需求文档.md
    外部操作接口说明.md
    素材缺失与优化清单.md
  project/
    index.html
    package.json
    game_design_doc.md
    src/
      main.js
      styles.css
      constants.js
      rules.js
      state.js
      ai.js
    scripts/
      check-rules.mjs
      extract-character-assets.py
      generate-howto-slides.mjs
    assets/
      characters/
      stages/
      ui/
      effect-words/
      concepts/
      posters/
      reference/
```

## 关键文件说明

- `project/src/constants.js`：平衡参数、行动配置、显示名。调数值优先改这里。
- `project/src/rules.js`：核心结算矩阵、冷不丁值变化、胜负判断、事件类型。
- `project/src/state.js`：初始状态、冷却递减、血量/冷不丁值 clamp。
- `project/src/ai.js`：普通 AI 权重逻辑和随机性。
- `project/src/main.js`：DOM 查询、主菜单、弹窗、倒计时、回合播放、效果词切换。
- `project/src/styles.css`：主菜单排版、战斗界面布局、按钮和效果词位置。
- `project/scripts/check-rules.mjs`：规则矩阵和不变量校验。
- `docs/冷不丁-攻防回合制机制设计需求文档.md`：机制规格文档。
- `docs/外部操作接口说明.md`：后续接 AI/在线玩家/外部控制时参考。

## 素材说明

角色素材：

- `project/assets/characters/zhang-*.png`
- `project/assets/characters/michel-*.png`
- 当前角色状态包括 idle、punch、doublePunch、lookBack、dodge、hit、throwMachine、win、lose、fakeOut。

舞台素材：

- `project/assets/stages/training-yard-stage-landscape.png`：当前战斗舞台背景

主菜单素材：

- `project/assets/ui/menu/main-menu-background-no-buttons-final.png`：当前主菜单底图，已去掉原图中的三个按钮
- `project/assets/ui/menu-buttons/start-game.png`
- `project/assets/ui/menu-buttons/how-to-play.png`
- `project/assets/ui/menu-buttons/settings.png`

游戏说明素材：

- `project/assets/ui/howto-final/howto-page-01-turn-goal.png`
- `project/assets/ui/howto-final/howto-page-02-defense-choice.png`
- `project/assets/ui/howto-final/howto-page-03-attack-punish.png`
- `project/assets/ui/howto-final/howto-page-04-fake-out.png`
- `project/assets/ui/howto-final/howto-page-05-double-punch.png`

效果词素材：

- 原始中文文件名保留在 `project/assets/effect-words/00-*.png` 等文件中
- 代码使用英文别名文件，例如：
  - `front-blocked.png`
  - `front-punch-hit.png`
  - `back-throw-blocked.png`
  - `back-throw-hit.png`
  - `fake-look-back.png`
  - `fake-guard-front.png`
  - `double-punch-hit.png`
  - `player-win.png`
  - `player-lose.png`

## 主菜单设计思路

主菜单不是用 CSS 重画，而是使用一张完整竖版背景图作为底图，再叠加三个独立 PNG 按钮。

原因：

- 保留原 UI 图的像素街机氛围和标题质感
- 方便后续直接替换按钮素材
- 避免 CSS 按钮与整体美术风格割裂

实现位置：

- HTML：`project/index.html` 的 `#mainMenu`
- CSS：`project/src/styles.css` 的 `.main-menu`、`.menu-stage`、`.menu-actions`、`.image-menu-btn`

按钮排版参考原始 UI 图：

- 居中纵向排列
- 位于主菜单下半区
- 三个按钮之间保持较大但均匀的间距
- 使用 `background-size: contain` 和比例容器适配不同屏幕

## 效果词设计思路

战斗结果不再用普通文字框显示，而是根据规则事件切换 PNG 效果词。

事件映射在 `project/src/main.js`：

```js
const EFFECT_WORDS = {
  playerWin,
  playerLose,
  frontBlocked,
  frontPunchHit,
  backThrowBlocked,
  backThrowHit,
  fakeLookBack,
  fakeGuardFront,
  doublePunchHit,
}
```

显示位置：

- CSS 类：`.burst-text.effect-word`
- 放在战斗舞台上方偏中
- 使用 `background-size: contain`
- 控制统一高度，避免不同文字图片大小差异过大
- 不应遮挡马大愣和麦克老六主体

## 游戏说明弹窗

游戏说明为 5 页图文翻页，面向第一次接触的用户。

当前页内容：

1. 目标和回合
2. 防守方怎么选
3. 进攻方怎么打
4. 啥也不干不是放弃
5. 冷不丁梆梆两拳

配置位置：

- `project/src/main.js` 的 `HOW_TO_PAGES`

## 启动和验证

进入项目目录：

```bash
cd project
```

启动本地预览：

```bash
npm run dev
```

浏览器访问：

```text
http://127.0.0.1:5173/
```

规则检查：

```bash
npm run check
```

当前最近一次已通过：

- `node --check src/main.js`
- `npm run check`

如果 `5173` 被占用，可以临时用：

```bash
python3 -m http.server 5174 --bind 127.0.0.1
```

## 外部控制接口

页面启动后会暴露：

```js
window.ColdBangBangGame
```

当前可用：

- `submitAction(actorId, actionId)`
- `getSnapshot()`
- `getLegalActions(actorId)`

后续接 AI、在线玩家或外部自动化时，优先使用这些接口，不要直接篡改内部状态。

## 开发注意事项

- 不要把主菜单按钮重新做成 CSS 文字按钮，当前已改为 PNG 按钮。
- 不要把效果词改回纯文字，当前目标是 PNG 效果词表现。
- 修改规则时必须同步更新 `scripts/check-rules.mjs`。
- 修改行动 ID 时要同步检查 `constants.js`、`rules.js`、`ai.js`、`main.js`、CSS action class。
- 投掷铁块冷却现在是毫秒级真实时间，不是回合数。
- 如果替换主菜单背景，保持 1080x1920 或同等竖屏比例最稳。
- 如果替换效果词图片，尽量保持透明背景，并让文字视觉高度接近。
- 这个项目目前无构建步骤，直接静态服务即可运行。

## 可交给外部模型的低风险任务

用户希望适当使用 DeepSeek 减少主线程 token 消耗。若另一台电脑配置了 DeepSeek 委托脚本，可把以下任务交给外部模型做草稿，再由 Codex 复核：

- 文案压缩/扩写
- 说明页文案候选
- checklist/验收项
- 非关键代码解释
- 素材命名和表格整理

不要把最终代码变更、私密路径、密钥、关键规则正确性完全交给外部模型定稿。

## 下一步建议

优先级从高到低：

1. 在浏览器/手机尺寸下视觉验收主菜单按钮位置。
2. 验收效果词出现位置，必要时微调 `.burst-text.effect-word` 的 `top/width/height`。
3. 检查游戏说明 5 页图片和文字是否都加载正确。
4. 增加音效：开局倒计时、拳击、铁块、受击、胜负。
5. 做正式开始/胜负结算页面。
6. 增加更多 AI 性格和难度。
