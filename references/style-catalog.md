# 内置艺术风格规格目录

## 四种风格总览

| # | 风格名 | 内部ID | 视觉特征 | 最佳适用场景 | 推荐分辨率 |
|---|-------|--------|---------|-------------|-----------|
| 1 | 速涂线稿 | `sketch` | 手绘铅笔质感、粗线条、高对比黑白/淡彩 | 概念探索、快速迭代、团队沟通草图 | 512:512 |
| 2 | 精致光照渲染 | `render` | 电影级光影、氛围渐变、景深感强 | 关键场景定调、pitch 用图 | 1024:576 |
| 3 | 高饱和美式动漫 | `anime` | 高对比度、浓郁色彩、粗轮廓线 | 角色设计、年轻受众向项目 | 768:768 |
| 4 | 日系街头感插画 | `street` | 清新色调、生活化场景、干净线条 | 叙事性插画、治愈系风格 | 768:768 |

---

## 1. ✏ 速涂线稿 (Sketch Style)

### 视觉特征
- **线条**：手绘感铅笔/炭笔线条，粗细不均，有"速写"的随意感
- **色彩**：以黑白灰为主轴，可选单色淡彩（sepia / 蓝调）
- **构图**：留白多、不填满、强调动势线和透视辅助线
- **质感**：纸张纹理可见、有交叉排线 (cross-hatching) 的阴影

### Prompt 关键词库

**核心词**：
```
storyboard sketch, pencil drawing, hand-drawn, rough lines,
concept art, loose strokes, sketchbook style
```

**变体方向**：
- 更精细 → `clean linework, detailed sketch, refined pencil`
- 更粗糙 → `rough sketch, gestural drawing, charcoal feel`
- 带色彩 → `watercolor wash, tinted sketch, monochrome with color accent`

### 适用项目阶段
- ✅ **概念探索期**：大量出图筛选方向时（速度快、成本低）
- ✅ **团队沟通期**：给程序/策划讲清楚视觉方向
- ✅ **Layout 阶段**：确定构图和节奏后再细化
- ❌ 不适合最终交付物或对外展示

### Canvas Mock 渲染参数（回退引擎）
- 背景：`#F0F0F0` 浅灰
- 线条色：`#333` 深灰
- 线宽：2px 主线 / 1px 辅助线
- 文字水印：「SKETCH」

---

## 2. ★ 精致光照渲染 (Render Style)

### 视觉特征
- **光影**：强烈主光源 + 环境光填充，体积光 (volumetric)
- **色彩**：电影级调色，对比度中高，饱和度适中
- **细节**：高保真纹理、景深效果 (DOF)、镜头光斑
- **氛围**：情绪驱动型——同一场景不同光照 = 完全不同的感觉

### Prompt 关键词库

**核心词**：
```
cinematic render, photorealistic, dramatic lighting,
depth of field, volumetric lighting, ray tracing,
atmospheric perspective, high quality, Unreal Engine 5 style
```

**光照变体**：
- 黄金时刻 → `golden hour lighting, warm tones, long shadows`
- 蓝调时刻 → `blue hour, cool ambient light, moody atmosphere`
- 室内柔光 → `soft window light, subsurface scattering, cozy interior`
- 戏剧侧光 → `chiaroscuro lighting, dramatic shadows, Rembrandt lighting`

### 适用项目阶段
- ✅ **Key Art**：宣传海报、商店页主图
- ✅ **Pitch 用图**：投资人/甲方演示
- ✅ **关键场景定调**：确定最终视觉品质标准
- ⚠️ 生图时间较长，不适合大批量迭代

### Canvas Mock 渲染参数（回退引擎）
- 背景：深蓝→紫渐变 (`#0A0A2A → #1A0A3A`)
- 强烈光源模拟：径向渐变白色光晕
- 光斑效果：随机半透明圆形叠加
- 文字水印：「RENDER」+ 星星装饰

---

## 3. 🎨 高饱和美式动漫 (Anime Style)

### 视觉特征
- **轮廓**：粗黑轮廓线 (bold outlines)，线宽一致性强
- **色彩**：高饱和度、纯度高、对比鲜明
- **阴影**：Cel-shading（硬边阴影），二分或三分明暗
- **动态**：构图追求动感（斜线、速度线、夸张透视）

### Prompt 关键词库

**核心词**：
```
high saturation anime art style, vibrant colors, bold outlines,
American comic influence, dynamic composition, cel shading,
dramatic shadows, saturated palette, Pixiv trending
```

**子风格变体**：
- 日式主流 → `anime key visual, Kyoto Animation style, soft shading`
- 欧美风 → `western comic style, DC/Marvel influence, graphic novel aesthetic`
- 赛博朋克 → `cyberpunk anime, neon lights, high contrast, glitch effects`
- 奇幻 → `fantasy anime, magical effects, ethereal glow, vibrant magic circles`

### 适用项目阶段
- ✅ **角色设计**：主角/配角视觉定义
- ✅ **年轻受众向项目**：二次元用户群体
- ✅ **社交媒体素材**：高点击率的视觉冲击力
- ⚠️ 需配合动漫专用 LoRA 效果最佳

### Canvas Mock 渲染参数（回退引擎）
- 背景：橙→红→紫三色高饱和渐变
- 角色：金色粗描边 + 品红填充眼睛
- 边框：金色 4px 粗框
- 文字水印：「ANIME」（半透明白）

---

## 4. 🌿 日系街头感插画 (Street Style)

### 视觉特征
- **色调**：柔和低饱和度为主 + 点缀高饱和色块（撞色设计）
- **线条**：干净但不僵硬，有手绘温度感（非机械精确）
- **氛围**："日常感"、"治愈系"、生活化叙事
- **背景**：细节丰富但有序（街景/室内/自然场景都有生活痕迹）

### Prompt 关键词库

**核心词**：
```
Japanese street illustration style, fresh color palette,
slice of life, casual atmosphere, clean lineart,
pastel tones with accent colors, warm and cozy mood,
lo-fi aesthetic, detailed background, Makoto Shinkai background style
```

**场景变体**：
- 街角便利店 → `Japanese convenience store corner street, neon signs, evening, warm interior light`
- 学校走廊 → `school hallway afternoon, sunbeams through windows, cherry blossom petals, youth`
- 居家室内 → `cozy Japanese apartment room, soft natural light, plants, books, lived-in details`
- 公园长椅 → `park bench under trees, dappled sunlight, peaceful afternoon, birds`

### 适用项目阶段
- ✅ **叙事性项目**：视觉小说 (VN)、互动故事、生活片段类游戏
- ✅ **角色日常**：展示角色的日常生活侧面
- ✅ "治愈系"定位的项目
- ✅ UI/背景素材：适合做菜单背景、加载画面

### Canvas Mock 渲染参数（回退引擎）
- 背景：浅绿→青绿→蓝绿的清新渐变
- 装饰元素：半透明圆形树叶点缀
- 角色：柔和肤色 + 小圆点眼睛 + 腮红
- 边框：青蓝色 1.5px 细框（精致感）
- 文字水印：「STREET」（低透明度绿色）

---

## 风格选择决策树

```
你的项目是什么类型？
│
├── 概念探索 / 快速迭代？
│   └── → 速涂线稿 ✏（最快最省）
│
├── 需要对外展示 / pitch / 宣传？
│   └── → 精致光照渲染 ★（最高品质感）
│
├── 目标受众是年轻人 / 二次元用户？
│   └── → 高饱和美式动漫 🎨（最强吸引力）
│
├── 叙事性 / 生活化 / 治愈系？
│   └── → 日系街头感插画 🌿（最佳情感共鸣）
│
├── 有自定义 LoRA 模型？
│   └── → LoRA 自定义模式（使用训练好的风格）
│
└── 不确定？
    └── → 默认从速涂线稿开始，确认方向后升级到其他风格
```
