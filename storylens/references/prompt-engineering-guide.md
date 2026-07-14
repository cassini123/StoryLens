# 游戏 AI 生图 Prompt 工程指南

## Prompt 结构公式

### 游戏概念图通用模板

```
[艺术风格前缀], [主体描述], [场景/环境], [镜头/构图],
[光影/氛围], [色彩模式], [质量修饰词]
```

**示例拆解**：

```
concept art, a lone warrior standing on a cliff edge, ancient ruins
in background, wide shot, dramatic golden hour lighting,
cinematic color grading, highly detailed, 8k resolution
│                │                          │           │              │                  │
│                │                          │           │              │                  └─ 质量层
│                │                          │           │              └─ 色彩/光影层
│                │                          │           └─ 镜头/构图层
│                │                          └─ 环境/场景层
│                └─ 主体/角色层
└─ 风格层（最重要，决定整体基调）
```

## 四种内置风格的最佳 Prompt 模板

### ✏ 速涂线稿 (Sketch Style)

```
storylens sketch, pencil drawing, hand-drawn, rough lines,
{主体}, {场景}, close-up / medium shot / wide shot (按需),
monochrome or subtle color wash, cross-hatching texture,
sketchbook style, concept art, loose strokes
```
- **适用**：早期概念探索、快速迭代、团队沟通用草图
- **分辨率建议**：512:512（线稿不需要太高分辨率）
- **引擎偏好**：SD + 线稿 LoRA 效果最佳

### ★ 精致光照渲染 (Render Style)

```
cinematic render, photorealistic, dramatic lighting,
{主体}, {场景}, {镜头类型},
volumetric lighting, ray tracing, depth of field,
atmospheric perspective, high quality, 8k, Unreal Engine style
```
- **适用**：关键场景定调、pitch 用图、高保真概念展示
- **分辨率建议**：1024:576 或 16:9 宽屏比例
- **引擎偏好**：Midjourney v6 光照效果最强

### 🎨 高饱和美式动漫 (Anime Style)

```
high saturation anime art style, vibrant colors, bold outlines,
American comic influence, dynamic composition,
{主体}, {场景}, action pose / emotional expression,
cel shading, dramatic shadows, saturated palette,
Pixiv trending, illustration, clean lineart
```
- **适用**：角色设计、宣传图、年轻受众向项目
- **分辨率建议**：768:768 方形或 8:11 竖版
- **引擎偏好**：NovelAI / SD +动漫 LoRA

### 🌿 日系街头感插画 (Street Style)

```
Japanese street illustration style, fresh color palette,
slice of life, casual atmosphere, clean lineart,
{主体}, 街景/日常场景, soft natural lighting,
pastel tones with accent colors, warm and cozy mood,
lo-fi aesthetic, detailed background, illustration
```
- **适用**：生活化叙事、角色日常、治愈系风格项目
- **分辨率建议**：768:768 或 3:4 竖版
- **引擎偏好**：SD + 日系风格 LoRA

## 不同引擎的适配策略

### Stable Diffusion (SD WebUI / SDXL)

**优势**：完全可控、可本地运行、支持 LoRA
**劣势**：需要硬件、prompt 较长时容易冲突

**SD 最佳实践**：
- 使用 **权重语法**强调重点：`(关键词:1.3)` 增强 `(关键词:0.7)` 减弱
- **负面 prompt 必填**：`lowres, bad anatomy, bad hands, text, error, missing fingers, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name`
- **采样器推荐**：DPM++ 2M Karras（质量/速度平衡）或 Euler a（快速预览）
- **Steps 推荐**：20-30 步足够，超过 40 步边际收益递减
- **CFG Scale**：7-8 为佳，过高导致过拟合

### Midjourney (MJ v6)

**优势**：艺术感强、理解自然语言、出图惊艳
**劣势**：不可控细节、需要订阅、不支持本地

**MJ 最佳实践**：
- 使用 `--stylize 250` 控制创意程度（低=保守，高=大胆）
- `--niji 6` 模式专门针对动漫风格
- `--ar 16:9` / `--ar 3:4` 控制宽高比
- `--chaos 20` 增加随机性（适合批量发散）
- 使用 `::2` / `::0.5` 语法控制词权重
- **参考图片**：`--iw 2` 提升参考图影响力

### DALL-E 3

**优势**：文字渲染能力极强、理解复杂指令
**劣势**：不可控构图、风格一致性差

**DALL-E 3 最佳实践**：
- 适合需要**画面内文字**的场景（海报、UI mockup）
- 自然语言描述效果优于关键词堆砌
- 适合"一句话生成完整场景"

## LoRA 训练与使用指南

### 什么时候需要训练 LoRA？

当以下条件满足时考虑自定义 LoRA：
1. 项目有明确的统一视觉风格需求
2. 现有模型/风格无法准确匹配目标审美
3. 需要大量生成同风格素材（角色/场景/物品）
4. 有足够的参考素材（10-30 张高质量样本）

### 训练参数速查表

| 参数 | 角色LoRA | 风格LoRA | 物品LoRA |
|------|---------|---------|---------|
| **样本数量** | 15-25张 | 20-40张 | 10-20张 |
| **分辨率** | 512-768 | 512-768 | 512-768 |
| **Training Steps** | 1000-2000 | 1500-3000 | 800-1500 |
| **Learning Rate** | 1e-4 ~ 5e-5 | 5e-5 ~ 2e-5 | 1e-4 ~ 5e-5 |
| **Trigger Word** | 角色/特征名 | 风格名 | 物品名 |

### Trigger Word 设计原则

- **简洁**：1-3个单词，避免过长
- **独特**：不会和常见词混淆
- **可记忆**：与风格/角色的核心特征关联
- 示例：`mystyle_vaporwave`、`char_hero_alex`

## 分镜生图的特殊技巧

### 保持角色一致性

分镜中同一角色出现在多帧时的处理方案：

1. **固定种子 (Seed)**：同一角色使用相同 seed + 相近 prompt
2. **ControlNet**：使用姿态参考图锁定人物结构
3. **IP-Adapter**：固定角色面部特征
4. **角色 LoRA**：为每个主要角色训练专用 LoRA（最稳定方案）

### 场景连贯性

相邻帧之间保持视觉连续性：

- 固定**色调和光影方向**
- 保持**背景元素的位置关系一致**
- 使用相同的**风格 prefix 和 quality tags**
- 仅修改**主体动作和镜头参数**

### 批量生图工作流

```
1. 先出一帧"基准帧"（确认风格/色调/角色）
   ↓
2. 以基准帧为参照，微调每帧的 prompt
   （仅改变动作描述+镜头）
   ↓
3. 批量提交，记录每帧的 seed
   ↓
4. 如有某帧不理想，用同 seed + 微调 prompt 重跑
   ↓
5. 导入分镜生成器排列排版
```
