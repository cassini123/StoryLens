# CHItest

CHI 2027 实验系统。最终协议：当前生成画面 → 草图外化 → 系统把草图写成自然语言 → 被试再精炼 → 再生成。

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
| `#/expert` | 四专家盲评（1–7），对照 Target Modification，不评“像不像原图” |
| `#/coding` | 研究者按该图的 active dimensions 编码（0–3） |
| `#/export` | event_log / auto_prompts / intents / generations / snapshots 等 |

数据在**当前浏览器**。顶栏进度条显示 T0 / T1 / T2 / T3 与完成百分比。右上角 **设置**：保存（写入本机）、刷新、退出（回首页，进度保留）、导出。正式实验结束立刻从 Export 或设置里下载。

---

## 2. 实验员

1. 打开 Participant，填 Participant ID 与背景题。
2. 不要提示编码维度（Object / Spatial 等），也不要发一份镜头/构图术语表。系统会说明没有标准答案、不需要专业术语。
3. 统一用系统里的引导词。顶栏左上角可切换中文/英文。
4. T1/T2/T3 最多 3 轮生成，满意即可 **Satisfied / Next**。
5. 结束后下载 session packet、`event_log.csv` 与 `auto_prompts.csv`。
6. 清浏览器数据：Export → Clear local data，或页脚 **Start over**。旧进度在 `chitest.store.v5`，不会自动接上 v4。

---

## 3. 被试流程

**T0** 观察当前画面，用自己的话写下读到的视觉信息。无 AI、无草图。点 **提交**。

**T1** 当前画面 → 写希望如何调整 → Generate（原图+文字）→ 看结果 → 可改文字再生成，最多 3 轮。无草图。

**T2 / T3** 草图始终在主界面（不是弹窗）。

1. 先和 T1 一样：当前画面 + 文字 → 第 1 轮生成（原图+文字，不含草图）。
2. 改草图（人物位置/朝向/距离、前后关系、物体、摄影机位置/方向/距离、前后景）。
3. 系统根据草图自动生成一段日常语言描述（**系统根据草图写出的描述**，只读，不会覆盖被试修改）。
4. 被试在 **你的描述** 里改成自己的话。
5. 再 Generate：原图 + 草图 + 被试修改后的描述。最多 3 轮。

T3 使用该被试未见过的新图，**保留草图和自动描述**，用来看这套机制能否迁移。

---

## 4. 生图 API

`POST /api/jimeng/`，密钥：

```text
JIMENG_ACCESS_KEY
JIMENG_SECRET_KEY
```

T1 与 T2/T3 第 1 轮：原图 + 文字。T2/T3 后续轮次：原图与草图拼成条件图，再与 **P_user** 一起提交。生成图是对照，不是评分对象。

---

## 5. 20 张当前画面

放到 `CHItest/public/data/tasks/images/`，命名见 `data/tasks/images/README.md`。元数据在 `data/tasks/stimuli.json`；研究者用的目标修改说明在 `data/tasks/target_modifications.json`。不要把图片路径写进 React 组件。
