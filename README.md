# 纯净模式预设 · Pure Mode Preset

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

一个给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）用的 **Agent 预设**。选中「纯净模式」后，发给模型的内容**只有你和 AI 的消息**：

- ❌ 没有系统提示词（Harness 开场白、persona、首方指引一律去掉）
- ❌ 没有工具定义（不挂载工具，并屏蔽宿主全局工具）
- ❌ 没有运行时上下文（当前工作目录、沙箱策略、审批策略、时间等）
- ❌ 没有插件注入消息（如 `dsh-mnemon` 的运行时记忆快照与 instructions）
- ✅ 只有 `source.kind === "user"` 的真实用户消息 + 助手回复

> 适合：想要最接近“裸模型对话”的体验、做对照实验、或验证模型原始输出。

## 功能特性

- **空系统提示词**：使用一个 `complete: true` 且文本为空的提示词段，取代整条系统提示词。
- **零工具**：预设不挂载任何工具插件，并用 `tools.restrict({ allow: [] })` 隐藏所有宿主全局工具。
- **零运行时上下文**：抑制可选上下文；对宿主必需的 `working-directory:current` 用空文本覆盖。
- **零注入消息**：宿主级过滤器在每一步只保留 `source.kind === "user"` 的用户消息，丢弃所有插件注入（mnemon 记忆、skill-catalog、time-context 等）。
- **纯对话定位**：没有压缩（compaction）等可选能力，长对话会持续累积消息。

## 工作原理

DSH 的 Agent 预设本质上是一份 Cordis 插件清单。本仓库提供两份插件 + 一条预设声明：

1. `pure.js`（预设内插件）
   - 注册一个空文本、`complete: true` 的提示词段 → 系统提示词为空；
   - `systemPrompt.suppressRuntimeContext()` 去掉可选运行时快照；
   - 以空文本覆盖 `working-directory:current`，去掉必需的“当前工作目录”提醒；
   - `tools.restrict({ allow: [] })` 屏蔽所有继承的全局工具。
2. `host.js`（宿主级插件）
   - 在每个 Agent 的 `system-prompt/assemble`（`agent/pre-step` 之前）时，为其挂一个**最外层**的 `agent/pre-step` 过滤器；
   - 该过滤器只保留 `source.kind === "user"` 的用户消息，把 `dsh-mnemon` 等插件的注入内容全部剔除；
   - 仅对 `composedPreset === "pure"` 的 Agent 生效，不影响其它会话。
3. `cordis.patch.yml`：注册 `pure-mode-host` 宿主行和 `pure` 预设行。

## 兼容性

- 开发与验证环境：DeepSeek Harness `0.2.2-rc.3`（Desktop / Web）。
- 依赖宿主约定：`working-directory:current` 上下文名、用户消息 `source.kind === "user"`、预设 `composedPreset()`。DSH 大版本变化时这些点可能需要适配。

## 安装

### 方式 A：插件管理界面（推荐）

把本目录放到你机器上的固定位置（例如 `D:\data\dsh-plugs\dsh-pure-mode-preset`），然后在 DSH 的 **插件 / Plugins → 添加本地插件** 中选择该目录，启用 bundle，重启一次 DSH。

### 方式 B：DSH 插件管理器 / profile

```text
plugin_manager install_bundle  target = <本目录绝对路径>
```

安装后新建会话即可在预设列表中看到「纯净模式」。

## 使用

1. 新建会话；
2. 在预设下拉里选择「**纯净模式**」；
3. 正常对话即可 —— 发往模型的内容只有你的消息与模型回复。

## 已知限制

- **无工具**：不能读写文件、执行命令、联网、调用子代理等。
- **无压缩**：超长对话最终可能触达模型上下文上限。
- **依赖宿主实现**：若 DSH 改变了工作目录上下文名、消息 `source.kind` 约定或预设 API，需要相应更新本插件。
- 该预设为“完全纯净”，不适合需要工具或长期记忆的场景。

## 目录结构

```text
dsh-pure-mode-preset/
├─ package.json          # bundle 清单（@local/dsh-pure-mode）
├─ cordis.patch.yml      # 注册宿主过滤行 + 纯净模式预设行
├─ pure.js               # 预设内插件：空提示词 / 无上下文 / 无工具
├─ host.js               # 宿主级插件：只保留 source.kind=user 的用户消息
├─ locale/               # 中英文标题与描述
├─ docs/DETAIL.md        # 插件详情
└─ icon.svg              # 图标
```

## English

**Pure Mode** is a DeepSeek Harness agent preset that sends **only the user and assistant messages** to the model — no system prompt, no tool definitions, no runtime context (working directory, sandbox/approval policy, time, …), and no plugin-injected messages (such as `dsh-mnemon` runtime memory snapshots and instructions). It is meant for raw-model conversations and controlled experiments. See the sections above for install (`Plugins → Add local plugin`) and usage (pick the `纯净模式` preset for a new session).

## License

[MIT](./LICENSE) © 2026 HuaGyuu
