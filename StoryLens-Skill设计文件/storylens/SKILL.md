---
name: storylens
description: "StoryLens AI 助手，专注游戏设计、分镜创作、严肃游戏与VR教育应用的专业咨询。触发词包括：游戏设计、分镜、StoryLens、严肃游戏、游戏化、game design、visual narrative、游戏化教学、游戏原型、level design、叙事设计、玩法机制、角色设计、UI/UX game、LoRA训练、风格迁移、AI辅助游戏创作、游戏美术、概念设计、cutscene、cinematic、StoryLens策划案、GDD。当用户询问游戏或分镜相关的设计建议、方法论评审或方案优化时触发此 Skill。"
agent_created: true
---

# StoryLens — 分镜生成器

> 游戏是综合性媒介——它能同时承载叙事、交互、视觉和系统思维。

## Overview

完整的分镜生成器交互应用。用户输入场景文字描述 → Enter 键触发 LLM 解析 → 两轮引导提问（表达重点 / 场景偏好 / 人物偏好 + 基于解析的细化问题）→ 填写分镜数量 → LoRA 加载确认（生成图片前必答）→ 确认后生成分镜（默认草图风格）→ 输出合并 PNG、单帧 PNG，每帧附带 4–6 层可展开知识图谱。

**硬性规则：** 不可跳过引导提问直接生成图片。对话与 HTML 应用须遵循相同步骤。

**框定范围（交集域）：** 主 Skill 与 TT 专家的有效协同限定在「分镜制作领域」内——横向主能力（4 模式）× 纵向专家纵深（4 位 TT 专家）的交集。详见 `skills/storyboard-production/SKILL.md`。

详细交互规格见 `references/storylens-language.md`。

### 触发条件

当用户表达以下意图时触发本 skill：

- "帮我生成分镜" / "画分镜" / "做个故事板" / "分镜脚本"
- "把这个故事/场景画成分镜"
- "我有一段描述，想看分镜效果"
- 任何涉及将文字描述转化为视觉分镜序列的请求

## Core Capabilities

### 1. 游戏设计咨询 (Game Design Consulting)

当用户提出游戏设计问题时：

1. **先理解用户真实意图**：很多"怎么做"的问题背后是"为什么"或"什么目标"
2. **给出结构化分析**：按「核心循环 → 系统层 → 表现层」三层展开
3. **提供可操作的建议**：每个建议都附带具体执行步骤，不空谈理论

**关键框架参考**（详见 `references/game-design-frameworks.md`）：
- MDA 框架（Mechanics-Dynamics-Aesthetics）
- 四象限设计法（机制/叙事/美学/技术）
- 玩法核心循环分析法
- 心流理论在游戏设计中的应用

### 2. 分镜创作指导 (StoryLens Direction)

分镜不只是画框——它是**视觉语言的预演**。

**分镜审查清单**：
- 镜头多样性：是否包含远景/全景/中景/特写/俯拍/仰拍的合理组合？
- 节奏曲线：是否有张弛变化？连续同景别是否超过3帧？
- 信息密度：每帧是否承载恰好一个关键信息？
- 情绪递进：情绪线是否有起伏而非平铺？
- 视觉连贯性：转场是否自然？180度规则是否遵守？

**内置工具**：`assets/storylens-generator.html` — 分镜生成器（三页面 Brutalism 设计系统应用）

### 3. 严肃游戏方案设计 (Serious Games Design)

**严肃游戏设计流程**（详见 `references/serious-games-methodology.md`）：
1. 明确非娱乐目标（学习成果 / 行为改变 / 态度转变）
2. 选择合适的游戏化策略（模拟 / 叙事 / 挑战 / 社交）
3. 设计核心学习循环（尝试 → 反馈 → 理解 → 应用）
4. 平衡"有趣"与"有效"
5. 设计评估指标

### 4. AI 辅助游戏创作 (AI-Assisted Game Creation)

**图片生成引擎**（已内置到分镜生成器）：
- **四重回退架构**：即梦 AI 图生图（默认）→ Buddy Cloud 云端生图 → SD WebUI API → Canvas Mock
- **即梦 AI 配置（推荐）**：`scripts/jimeng_proxy_server.py`（端口 18901）封装火山引擎 `jimeng_t2i_v40`；密钥在 `scripts/.env` 或 HTML LoRA 面板；启动：`bash scripts/start_jimeng.sh`
- **风格参考图**：`assets/style-refs/{sketch|render|anime|street}/ref.jpg`；生图时作为 `reference_image` 传入即梦（strength≈0.58），每帧 prompt 以 `frame.desc`（分镜句）为主
- **伪 LoRA 训练**：上传参考图 → 保存到 `assets/lora/{模型名}/`（非真实训练）→ 生图时轮换参考图 + trigger prompt；localStorage + 服务端 `/lora/list` 双端复用
- **Buddy Cloud 配置**：代理服务器 `image_proxy_server.py`（端口 18900）封装 `buddy-cloud.py image` CLI；Token 通过 HTML 设置面板的密码框传入或环境变量 `BUDDY_CLOUD_TOKEN`；Token 随每次 POST body 发送到代理，代理写入临时文件后用 `--token-file` 传递给 CLI（避免 stdin 管道问题）
- **5 种内置艺术风格**（sketch/render/anime/street/lora）：
  - ✏ **速涂线稿**（默认草图）— 手绘铅笔质感
  - ★ **精致光照渲染** — 电影级光影/氛围渐变
  - 🎨 **高饱和美式动漫** — 高对比度/浓郁色彩/粗轮廓
  - 🌿 **日系街头感插画** — 清新色调/生活化场景/干净线条
  - ⬡ **自定义 LoRA** — 用户上传参考图伪训练风格（图生图参考，可复用）

**Prompt 工程指南**（详见 `references/prompt-engineering-guide.md`）

## 核心交付物

### 主应用 HTML 文件

`assets/storylens-generator.html`（单文件应用，Brutalism 设计系统）

独立运行的单 HTML 文件，包含所有 CSS + JS + 数据。使用 `preview_url` 工具打开预览，或部署到 Web 服务器。

## 完整工作流

### Phase 1：文字描述 + Enter 解析

用户在 INPUT 页面输入场景文字描述，按 Enter 触发 LLM 解析。提取人物、场景、情绪、视觉线索及信息空白。解析完成后进入第一轮引导提问。

### Phase 2：两轮引导提问

**第一轮 — 固定三维（3 张问题卡片）**

| 卡片 | 维度 | A | B | C |
|------|------|---|---|---|
| Q1 | 表达重点 | 情绪氛围 | 动作叙事 | 环境氛围 |
| Q2 | 场景偏好 | 室内/日间 | 室外/黄昏 | 混合/夜景 |
| Q3 | 人物偏好 | 儿童-女-东亚 | 青年-男-欧美 | 中年+-混合-多元 |

D 选项：文本输入框，用户自由填写。3 题全部必选后点击「继续细化提问」。

**第二轮 — 基于解析的细化提问（3–5 张卡片）**

LLM 结合原始描述 + 第一轮答案生成具体引导问题。常见方向：镜头节奏、影调风格、构图偏好、叙事结构、参考风格。

**确认与帧数**

- 分镜数量输入框（1–24，默认 6）
- 点击「确认帧数」进入 LoRA 加载确认

**LoRA 加载确认（生成图片前必答）**

| 选项 | 说明 |
|------|------|
| A | 不使用 LoRA（默认草图风格） |
| B | 使用已有 LoRA 模型（列出已训练模型） |
| C | 上传并训练新 LoRA（引导上传参考图） |
| D | 自定义说明 |

用户确认 LoRA 选择后方可进入 DRAFT / RENDER 并触发生成。

### Phase 3：生成分镜

默认风格：

| 维度 | 默认值 |
|------|--------|
| 风格类别 | 草图风格 |
| 2D/3D | 2D |
| 黑白/彩色 | 黑白 |

**进阶风格选择**：底部上拉抽屉，可选风格类别（草图/渲染/动漫/街头/自定义LoRA）× 维度（2D/3D）× 色彩（黑白/彩色）。

### Phase 4：输出交付

| 输出 | 说明 |
|------|------|
| 合并 PNG | 所有分镜在一张 PNG 中（3 列网格布局），优先使用渲染后图片 |
| 单帧 PNG | 每帧独立高清 PNG，可批量下载 |
| JSON | 完整 state + frames + kgData + prompts |
| Excel/CSV | 帧号、描述、景别、人物、场景、情绪 |
| PDF | 打印友好布局（调用 window.print） |

### Phase 5：知识图谱（每帧）

点击任意分镜帧的 `+` 按钮（弹跳脉冲动画），右侧滑入知识图谱叠加层：

**三层可视化系统：**

1. **交互式 SVG 环形图**（顶部）
   - 中心节点 + 维度节点，连线粗细表示占比
   - **Hover 高亮**：悬停节点时高亮关联连线，非关联节点淡化（opacity 0.25），tooltip 显示标签和百分比
   - **Click 选中**：点击节点锁定选中态，再次点击取消；选中节点外圈高亮（opacity 0.5, stroke-width 2）
   - **入场动画**：节点依次弹入（stagger 40-60ms），cubic-bezier 弹跳曲线
   - 外围参考节点（dashed 线条）同样可交互

2. **D3 力导向图**（中部）
   - 可拖拽交互式关系图
   - 力模拟：link force + charge + center + collision
   - 节点按层级大小不同（root=22, dim=15, ref=11, tech=8）

3. **4–6 层可展开树形图**（底部）
   - 默认显示 L0–L2（前三层），L3+ 折叠
   - L3+ 节点显示青色 `+` 圆形展开按钮，点击展开
   - 展开动画：子节点依次弹入（stagger 50ms），bounce-in curve
   - 折叠动画：slide-out 150ms 后隐藏
   - 浅层节点显示 `▼`/`▶` 三角折叠图标
   - 已展开节点状态持久化（kgoOpenSet）

**维度定义**：kgData 结构（L0: root, L1: 6维度, L2: 参考作品, L3: 具体参数）

## 三页面架构（Brutalism 设计系统）

| 页面 | 功能 | 关键交互 |
|------|------|---------|
| 01 INPUT | 描述输入 → Enter 解析 → 两轮引导提问 → 帧数 → LoRA 确认 | Enter 触发解析；问题卡片 A/B/C/D + 下拉 SVG chevron |
| 02 DRAFT | 分镜网格预览 + 风格抽屉 + KG 展开 | 点击 `+` 打开 4–6 层图谱（交互SVG + D3 + 树）；底部抽屉切换进阶风格 |
| 03 RENDER | 渲染输出 + 合并/单帧 PNG 导出 | 导出栏一键下载；优先使用 generatedImages 而非 canvas mock |

### Brutalism 设计系统

- CSS 变量体系：`--bg/#fff`, `--fg/#000`, `--red`, `--yellow`, `--cyan`, `--orange`, `--pink`, `--purple`, `--blue`, `--green`
- 核心 class：`.b-box`, `.b-btn`, `.b-tag`, `.b-input`
- 阴影：硬阴影 `box-shadow: var(--shadow)` (4px 4px 0)
- 字体：Inter (Google Fonts)
- 所有边框：2px solid var(--fg)

### 历史记录

- localStorage 键名 `sb_history_v2`，最多 20 条
- 每条记录包含 144×90 复合缩略图（取前3帧，优先使用 generatedImages）
- `generatedImages` 不持久化（避免 localStorage 5MB 限制）
- 历史列表显示缩略图预览 + 版本号 + 时间戳

## Agent 执行步骤

1. **接收描述** — 引导输入或接收对话中的场景文字
2. **Enter 解析** — 提取叙事要素，识别信息空白
3. **第一轮提问** — 展示 Q1/Q2/Q3（表达重点 / 场景 / 人物），等待 A/B/C/D 作答
4. **第二轮提问** — 生成 3–5 道细化问题，等待作答
5. **确认帧数** — 展示数量输入框，默认 6 帧
6. **LoRA 加载确认** — 生成图片前必问：是否加载 LoRA（A 不用 / B 已有 / C 上传训练 / D 自定义）；不可跳过
7. **生成分镜** — 默认草图 2D 黑白；构建 frames JSON + 预览
8. **构建 KG** — 每帧 4–6 层 kg_tree + references_top3
9. **输出** — 合并 PNG + 单帧 PNG + 打开 HTML 预览

## Workflow Decision Tree

```
用户提问
├── 游戏设计/策划问题?
│   └── → 用 Core Capabilities #1 (游戏设计咨询)
├── 分镜/镜头/视觉叙事问题?
│   ├── 需要生成分镜? → 引导使用 storylens-generator.html
│   └── 审查/优化分镜? → 用 Core Capabilities #2 (分镜指导)
├── 教育/科学/文化传播游戏化?
│   └── → 用 Core Capabilities #3 (严肃游戏)
├── AI 生图/Prompt/LoRA 问题?
│   └── → 用 Core Capabilities #4 (AI 辅助创作)
└── 不确定方向?
    └── → 启发式追问：你当前的项目阶段是什么？(概念/原型/开发/发行)
```

## Response Guidelines

### 回答原则

1. **启发优先**：先追问用户真正想解决的问题
2. **案例驱动**：每个方法论建议至少搭配一个具体案例
3. **技—理—道三层**：技（工具层）→ 理（方法层）→ 道（哲学层）
4. **务实收尾**：每次回答给出一个可操作的下一步建议

### 表达规范

- 使用专业但易懂的语言，避免堆砌术语
- 给出新概念时附带简短定义
- 对比分析时使用表格呈现
- 复杂流程使用编号步骤 + 可视化示意

## Resources

### references/
加载条件：当需要深入某个领域的方法论、框架细节或案例库时按需读取。

- `references/game-design-frameworks.md` — 游戏设计核心框架详解（MDA/四象限/心流等）
- `references/serious-games-methodology.md` — 严肃游戏设计方法论与领域模板
- `references/storylens-language.md` — 分镜视觉语言完全手册（镜头语法/情绪曲线/转场）
- `references/prompt-engineering-guide.md` — 游戏 AI 生图 Prompt 工程最佳实践
- `references/style-catalog.md` — 5 种艺术风格（sketch/render/anime/street/lora）技术规格

### assets/
直接使用的输出资源文件。

- `assets/storylens-generator.html` — StoryLens分镜生成器主页面（完整单页应用，Brutalism 设计系统，~2900 行）
- `assets/sketch-style.jpg` — 速涂线稿风格参考图
- `assets/render-style.jpg` — 精致光照渲染风格参考图
- `assets/anime-style.jpg` — 高饱和美式动漫风格参考图
- `assets/street-style.jpg` — 日系街头感插画风格参考图

### scripts/
自动化脚本（如需要）。

- `scripts/jimeng_proxy_server.py` — 即梦 AI 文生图代理（端口 18901，火山引擎 Visual API）
- `scripts/image_proxy_server.py` — Buddy Cloud 生图代理（端口 18900）

### 分镜制作子 Skill（交集域）

进入分镜生成流程时，Agent **必须先读取** `skills/storyboard-production/SKILL.md`：

| 概念 | 说明 |
|------|------|
| **横向 H** | 主能力模式：游戏设计 / 影视分镜 / 产品概念 / 创作灵感 |
| **纵向 V** | TT 专家纵深：辛向阳 / 娄永琪 / 李何槿 / 柳喆俊 |
| **交集 H∩V** | 专家只在 parse/refine/generate/对话阶段贡献与当前分镜相关的方法论切片 |
| **Out of Scope** | 纯咨询、跳过提问、专家子 Skill 全量加载而无分镜上下文 |

完整矩阵与 HCI 映射见 `skills/storyboard-production/intersection-matrix.md`。

### TT 专家协同（对话框 + HTML 挂件同步）

**架构分工**（主 Skill 与 HTML 一一对应）：

| 层级 | 对话框 Agent（SKILL.md） | HTML 悬浮挂件 |
|------|--------------------------|---------------|
| 主能力 | Core Capabilities #1–#4，按 Workflow Decision Tree 路由 | 右下角 **StoryLens能力条**（4 个圆形按钮：🎮游戏设计 / 🎬分镜创作 / 📚严肃游戏 / 🎨AI生图） |
| TT 专家 | 用户点名或请求专家视角时，**可选**读取 `专家skill/` 对应 Agent | AI 提问面板内 **TT 专家协同**（4 个圆形头像） |

**对话框 Skill（Agent 侧）**：当用户提到专家名字或请求专家视角时，Agent **可选择**调用 `专家skill/` 下四位企业自建专家（非强制，默认仍用StoryLens主 Skill）：

| 专家 | 文件夹 | Agent 入口 | 专长 | 头像标识 |
|------|--------|-----------|------|----------|
| 辛向阳 | `xin-xiangyang` | `agents/xin-xiangyang.md` | 交互设计 · 行为逻辑 · IDR方法 | 🌻 向日葵 |
| 娄永琪 | `lou-yongqi-perspective` | `agents/lou-yongqi-perspective.md` | 设计驱动创新 · 社会创新 · 设计教育 | 👓 眼镜 |
| 李何槿 | `li-hejin` | `agents/li-hejin.md` | 设计驱动创业 · 循环经济 · 用户体验 | 🍐 梨 |
| 柳喆俊 | `liu-zhe-jun` | `agents/liu-zhe-jun.md` | 严肃游戏 · 游戏化教学 · VR教育 | **6** |

**专家激活触发词**（任一命中即可切换）：
- 辛向阳：`辛向阳的视角` / `辛向阳怎么看` / `切换到辛向阳`
- 娄永琪：`娄永琪的视角` / `用娄永琪的方法` / `Prof.Lou 视角`
- 李何槿：`李何槿的视角` / `可持续设计评估` / `循环经济视角`
- 柳喆俊：`柳喆俊的视角` / `严肃游戏设计` / `游戏化教学`

**HTML 主能力悬浮挂件**（`assets/storylens-generator.html` · `#skillFloat`）：页面右下角 AI 按钮左侧，4 个圆形能力按钮对应 SKILL.md Core Capabilities #1–#4；选中后 AI 面板标题、头像、快捷 chips 同步切换。

**HTML TT 专家协同区**（`#expertAvatars`）：AI 提问面板顶部，四位专家以圆形头像展示，点击选择/取消，选中后：
- 标题变为「StoryLens + 专家名」
- 快捷 chips 切换为专家专属提问
- 回复带有专家 AI 视角前缀和紫色 TT专家 标签
- 取消专家后恢复当前主能力模式的 chips

### 即梦 AI 生图接入

**启动代理**（在项目根目录或 `storylens/scripts/` 下）：

```bash
cd storylens/scripts
pip install -r requirements.txt   # 首次
chmod +x start_jimeng.sh
./start_jimeng.sh                 # 默认端口 18901
```

**凭证配置**（二选一）：
1. `scripts/.env`：`JIMENG_ACCESS_KEY` + `JIMENG_SECRET_KEY`（IAM Access Key，AK 以 `AKLT` 开头）
2. HTML 设置面板 → 即梦 AI 生图引擎 → 填入 Access Key / Secret Key（保存至 localStorage）

> ⚠️ 即梦 API Key（如 `cP6q…`）**不能**作为 Access Key；须使用火山引擎 IAM 控制台配对的 Access Key ID + Secret Access Key。

**HTML 调用链**：分镜渲染页优先走即梦 → Buddy Cloud → SD WebUI → Canvas Mock（四重回退）。

## 注意事项

- D3.js v7.8.5 通过 CDN 加载（cloudflare）
- JS 模板字符串内避免正则，改用 split().replace()
- KG 叠加层使用 `backdrop-filter: blur(8px)`，backdrop 通过 CSS 相邻兄弟选择器 `.kg-overlay.open + .kg-overlay-backdrop` 控制可见性
- 历史记录 localStorage 键名 `sb_history_v2`，最多 20 条
- 合并 PNG 用 Canvas 2D 绘制 3 列网格后导出，优先使用 `appState.generatedImages` 中的渲染图
- KG 树形默认 3 层可见（L0–L2），用户可展开至 4–6 层；第 6 层仅在子节点 ≥ 2 时生成
- SVG 环形图支持 hover 高亮关联节点、click 锁定选中、tooltip 显示标签和占比
- `openKGOverlay` 中 `classList.add('open')` 必须在 D3/tree 渲染之前执行（保证 UI 响应）
- 同名 function 声明会被后者覆盖，避免在脚本中重复定义同名函数
- 风格参考图使用 `object-fit:contain` 确保完整显示无裁切
