# StoryLens Skill 设计文件包

**TT设计 × 腾讯初赛提交 · Skill 设计交付物**

本压缩包包含 StoryLens 分镜生成器的 **HTML 交互应用**、**大模型 Skill 定义文件**（可在 Cursor / CodeBuddy / 兼容 Agent 平台加载）及 **技术说明文档**。

---

## 目录结构

```
StoryLens-Skill设计文件/
├── README.md                          ← 本说明文档
├── index.html                         ← 入口页（导航至生成器与技术说明）
├── tech.html                          ← HCI 技术框架与 Skill 关系总览
├── tech-summary.png                   ← 答辩用关系总览图
├── hci-interaction-flow-agent-html-hd.png  ← Agent ↔ HTML 交互流程图
│
├── storylens/                         ← 主 Skill（StoryLens 分镜生成器）
│   ├── SKILL.md                       ← 主入口：触发词、工作流、TT 专家协同规则
│   ├── references/                    ← 方法论与视觉语言参考（按需加载）
│   ├── skills/storyboard-production/  ← 分镜制作子 Skill（交集域矩阵）
│   └── assets/
│       ├── storylens-generator.html   ← 分镜生成器单页应用（~4600 行）
│       ├── easy-draft-draw.js         ← 草图绘制辅助脚本
│       └── lora/                      ← LoRA 风格元数据
│
├── 专家skill/                         ← 四位 TT 专家 Agent（Multi-Skill 架构）
│   ├── xin-xiangyang/                 ← 辛向阳 · 交互设计 / IDR 方法
│   ├── lou-yongqi-perspective/        ← 娄永琪 · 设计驱动创新 / 社会创新
│   ├── li-hejin/                      ← 李何槿 · 设计驱动创业 / 循环经济
│   └── liu-zhe-jun/                   ← 柳喆俊 · 严肃游戏 / 游戏化教学
│
└── demo-output/story1/                ← 示例分镜输出（演示用）
```

---

## 一、HTML 交互应用

### 快速启动

在项目根目录启动本地 HTTP 服务（避免 `file://` 跨域限制）：

```bash
cd StoryLens-Skill设计文件
python3 -m http.server 8080
```

浏览器打开：**http://localhost:8080**

| 页面 | 路径 | 说明 |
|------|------|------|
| 入口 | `index.html` | 导航至分镜生成器与技术说明 |
| 分镜生成器 | `storylens/assets/storylens-generator.html` | 完整交互：引导提问 → LoRA 确认 → 分镜生成 → 知识图谱 |
| 技术框架 | `tech.html` | HCI 关系图、主 Skill × 专家交集域、Mermaid 流程 |

### 分镜生成器核心流程

1. 输入场景文字描述 → Enter 触发 LLM 解析  
2. 两轮引导提问（表达重点 / 场景偏好 / 人物偏好 + 细化问题）  
3. 填写分镜数量 → **LoRA 加载确认**（生成图片前必答）  
4. 确认后生成分镜 → 输出合并 PNG、单帧 PNG，每帧附带 4–6 层知识图谱  

> **硬性规则**：不可跳过引导提问直接生成图片。对话 Agent 与 HTML 应用须遵循相同步骤。

### 生图引擎（可选）

完整生图需配置即梦 AI 或 Buddy Cloud 代理（见 `storylens/SKILL.md` 末尾「即梦 AI 生图接入」）。未配置时 HTML 仍可演示交互流程与 Canvas Mock 回退。

---

## 二、大模型 Skill 定义文件

### 2.1 主 Skill — `storylens/SKILL.md`

**触发词示例**：游戏设计、分镜、StoryLens、严肃游戏、game design、visual narrative、LoRA 训练、AI 辅助游戏创作……

**核心能力（4 模式）**：

| 模式 | 说明 |
|------|------|
| 🎮 游戏设计咨询 | MDA 框架、四象限设计法、心流理论 |
| 🎬 分镜创作指导 | 镜头语法、情绪曲线、StoryLens 视觉语言 |
| 📚 严肃游戏方法论 | 机制翻译、沉浸阶梯、领域模板 |
| 🎨 AI 生图 Prompt 工程 | 5 种艺术风格规格、即梦/Buddy 调用链 |

**分镜子 Skill**：进入分镜流程时须先读 `storylens/skills/storyboard-production/SKILL.md`（横向主能力 × 纵向 TT 专家的交集域）。

### 2.2 专家 Skill — `专家skill/`

每位专家采用 **Agent + Multi-Skill** 架构：

```
{expert-slug}/
├── SKILL.md              ← 入口 + 加载规则 + YAML frontmatter（name / description / 触发词）
├── AGENT.md              ← 架构说明（部分专家有）
├── agents/*.md           ← Agent 人格与路由
├── skills/*/SKILL.md     ← 子能力模块
├── references/           ← 专家知识库
├── persona.md            ← 人格设定（部分专家有）
├── router.md             ← 智能路由（部分专家有）
└── .codebuddy-plugin/plugin.json  ← CodeBuddy 插件 manifest
```

| 专家 | 文件夹 | 激活触发词示例 |
|------|--------|----------------|
| 辛向阳 | `xin-xiangyang` | 「辛向阳的视角」「辛向阳怎么看」 |
| 娄永琪 | `lou-yongqi-perspective` | 「娄永琪的视角」「用娄永琪的方法」 |
| 李何槿 | `li-hejin` | 「李何槿的视角」「可持续设计评估」 |
| 柳喆俊 | `liu-zhe-jun` | 「柳喆俊的视角」「严肃游戏设计」 |

### 2.3 在 Cursor 中使用

1. 将本包解压到任意目录  
2. **主 Skill**：将 `storylens/` 目录复制到项目的 `.cursor/skills/` 或用户 Skill 目录，或在与 Agent 对话时 `@storylens/SKILL.md` 引用  
3. **专家 Skill**：按需将 `专家skill/{专家名}/` 复制到 Skill 目录，或通过 `@专家skill/lou-yongqi-perspective/SKILL.md` 等方式加载  
4. Agent 会在匹配触发词时自动遵循 SKILL.md 中的工作流与硬性规则  

### 2.4 在 CodeBuddy / WorkBuddy 中使用

各专家目录下的 `.codebuddy-plugin/plugin.json` 为插件 manifest，声明子 Skill 路径与 Agent 入口。按平台文档将对应文件夹导入为专家插件即可。

---

## 三、Skill × HTML 协同架构

```
┌─────────────────────────────────────────────────────────┐
│  对话框 Agent（SKILL.md）                                │
│  Core Capabilities #1–#4 + TT 专家可选加载               │
└───────────────────────┬─────────────────────────────────┘
                        │ 同一工作流、同一交集域
┌───────────────────────▼─────────────────────────────────┐
│  HTML 分镜生成器（storylens-generator.html）             │
│  · 右下角 StoryLens 能力条（4 圆形按钮）                 │
│  · AI 面板内 TT 专家协同区（4 头像）                     │
└─────────────────────────────────────────────────────────┘
```

- **横向 H**：游戏设计 / 影视分镜 / 产品概念 / 创作灵感  
- **纵向 V**：辛向阳 / 娄永琪 / 李何槿 / 柳喆俊  
- **交集 H∩V**：专家仅在分镜相关阶段贡献方法论切片（详见 `intersection-matrix.md`）

完整 HCI 说明见 `tech.html`。

---

## 四、references 索引

| 文件 | 内容 |
|------|------|
| `storylens/references/game-design-frameworks.md` | MDA、四象限、心流等 |
| `storylens/references/serious-games-methodology.md` | 严肃游戏设计方法论 |
| `storylens/references/storylens-language.md` | 分镜视觉语言手册 |
| `storylens/references/prompt-engineering-guide.md` | 游戏 AI 生图 Prompt 工程 |
| `storylens/references/style-catalog.md` | 5 种艺术风格技术规格 |

---

## 五、版本与许可

- **项目**：StoryLens · TT设计 × 腾讯初赛  
- **主 Skill 版本**：见 `storylens/SKILL.md` frontmatter  
- **专家插件版本**：见各目录 `plugin.json` 或 `SKILL.md` 中的 `version` 字段  

---

## 六、常见问题

**Q：打开 HTML 后 AI 请求失败？**  
A：生图与 LLM 调用需本地代理或 API 配置；纯 UI 演示可不依赖后端。

**Q：Agent 跳过了引导提问？**  
A：违反 SKILL 硬性规则。请确保 Agent 已加载 `storylens/SKILL.md` 及 `skills/storyboard-production/SKILL.md`。

**Q：如何只使用某一位专家？**  
A：单独加载 `专家skill/{专家名}/SKILL.md`，或使用对应触发词切换视角。

---

*打包日期：2026-07-10*
