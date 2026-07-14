# StoryLens

用自然语言描述场景，经引导提问与 LoRA 确认后，生成分镜序列；每帧附带可展开的知识图谱。主 Skill 与四位专家协同，限定在「分镜制作」交集域内。

---

## 快速开始

```bash
# 在仓库根目录启动本地服务（避免 file:// 限制）
python3 -m http.server 8080
```

浏览器打开 **http://localhost:8080**

| 页面 | 路径 |
|------|------|
| 入口 | [`index.html`](index.html) |
| 分镜生成器 | [`storylens/assets/storylens-generator.html`](storylens/assets/storylens-generator.html) |
| 技术框架说明 | [`tech.html`](tech.html) |

完整 Skill 设计文件也可从 [`StoryLens-Skill设计文件/`](StoryLens-Skill设计文件/) 进入，用法见该目录 README。

---

## 核心能力

- **分镜工作流**：场景描述 → LLM 解析 → 两轮引导提问 → 分镜数量 → LoRA 确认 → 生成（不可跳过引导）
- **多风格生图**：草图 / 渲染 / 动漫 / 街拍 / LoRA；支持 Buddy Cloud、即梦代理，未配置时回退 Canvas Mock
- **知识图谱**：每帧 4–6 层可展开可视化
- **专家协同**：辛向阳 · 娄永琪 · 李何槿 · 柳喆俊（Multi-Skill Agent）
- **可加载 Skill**：LearnBuddy 兼容，见 `storylens/SKILL.md` 与 `专家skill/`

---

## 仓库结构

```
.
├── index.html / tech.html          # 入口与 HCI 技术总览
├── storylens/                      # 主 Skill + 分镜生成器
│   ├── SKILL.md
│   ├── assets/storylens-generator.html
│   ├── skills/storyboard-production/
│   ├── references/
│   └── scripts/                    # 本地代理（Buddy / 即梦 / LLM）
├── 专家skill/                      # 四位专家 Agent
├── StoryLens-Skill设计文件/        # Skill 设计文件包
├── demo-output/                    # 示例分镜输出
├── 训练素材/                       # LoRA 训练参考图
├── 周边设计文件/                   # 物料与视觉周边
├── assets/ / references/ / scripts/# 早期 storyboard skill 兼容布局
├── 场景洞察.pptx / *.mp4           # Demo 与说明材料
└── _archive/                       # 开发与历史脚本
```

---

## 代理服务（可选）

完整生图建议启动本地代理后再在生成器中填写地址：

```bash
cd storylens/scripts
# 按需：复制 .env.example → .env，填写密钥（勿提交 .env）
python3 image_proxy_server.py      # Buddy Cloud
# 或 ./start_jimeng.sh / ./start_llm.sh
```

密钥只放在本地 `.env` 或界面输入框，不要写入仓库。

---

## 在 LearnBuddy / Agent 中使用

1. 将 `storylens/` 放到 LearnBuddy 的 skills 目录（或对话中 `@storylens/SKILL.md`）
2. 按需加载 `专家skill/{专家名}/`
3. 分镜流程须遵循 `skills/storyboard-production/SKILL.md` 中的交集域规则

更细的结构与插件说明见 [`StoryLens-Skill设计文件/README.md`](StoryLens-Skill设计文件/README.md)。

---

## 演示与材料

| 文件 | 说明 |
|------|------|
| `storylens.mp4` | 产品演示 |
| `米奇美式_StoryLens_Demo.mp4 .mp4` | 风格 Demo |
| `场景洞察.pptx` | 场景洞察说明 |
| `hci-interaction-flow-agent-html-hd.png` | Agent ↔ HTML 交互流 |
| `tech-summary.png` | 技术关系总览图 |
