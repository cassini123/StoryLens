# Sketch-Based Cognitive Scaffolding for Generative AI

CHI 2027 实验系统。最终协议：T0 自然描述基线 → T1 AI 画面反馈 → T2 草图脚手架 → T3 带草图的迁移。

线上入口：`https://www.2027mitgo.top/chitest/` 或 `https://storyboard-skill.vercel.app/chitest/`

---

## 1. 启动

```bash
cd CHItest
npm install
npm run dev
```

| 地址 | 角色 |
| --- | --- |
| `#/` | 首页 |
| `#/participant` | 被试：T0×1 + T1×2 + T2×2 + T3×2（共 7 题） |
| `#/participant?short=1` | 干跑：每阶段 1 题 |
| `#/expert` | 四专家盲评（1–7） |
| `#/coding` | 研究者六维编码（0–18） |
| `#/export` | event_log / intents / generations / snapshots 等 |

数据在**当前浏览器**。顶栏进度条显示 T0 / T1 / T2 / T3 与完成百分比。右上角 **设置**：保存（写入本机）、刷新、退出（回首页，进度保留）、导出。正式实验结束立刻从 Export 或设置里下载。

---

## 2. 实验员

1. 打开 Participant，填 Participant ID 与背景题。
2. 不要提示编码维度（Object / Spatial 等），也不要发一份镜头/构图术语表。被试自己会用的专业说法可以保留，不要说「不要用专业术语」。
3. 统一用系统里的引导词：请看图，用自己的话尽可能清楚描述希望 AI 重新生成的画面。顶栏左上角可切换中文/英文。
4. T1/T2/T3 最多 3 轮生成，满意即可 **Satisfied / Next**。
5. 结束后下载 session packet 与 `event_log.csv`。
6. 清浏览器数据：Export → Clear local data，或页脚 **Start over**。

---

## 3. 被试流程

**T0** 只写描述，无 AI、无草图。

**T1** 写描述 → Generate（原图+文字）→ 看结果 → 可改文字再生成，最多 3 轮。

**T2 / T3** 写描述 → 生成并常驻低保真草图 → 改草图/文字 → Generate（原图+草图+文字）→ 最多 3 轮。T3 使用该被试未见过的新图，**保留草图**。

草图可：移动/旋转/缩放人物与物体、添加删除、视线与运动、机位距离、FG/MG/BG。不要追求写实。

---

## 4. 生图 API

`POST /api/jimeng/`，密钥：

```text
JIMENG_ACCESS_KEY
JIMENG_SECRET_KEY
```

T1 将原图作为条件图；T2/T3 将原图与草图拼成条件图后与文字一起提交。生成图是反馈，不是评分对象。
