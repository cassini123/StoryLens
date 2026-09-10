# N=11 按论文协议的数据分析

数据：2026-09-09 导出的 11 个 participant zip（P001–P011）。P012 未到。  
分析单位：zip 包标签 `P001`…`P011`，**不以填写的 participant_id 去重**。  
本文只报告汇总与过程检查，不含原文 prompt、截图或可识别昵称。

对照协议：`CHItest/docs/experiment-protocol.md`。  
完整版（内容 + 构念对照 + 效度/去噪）：`CHItest/docs/n11-complete-report.md`。

---

## 1. 论文要回答什么

研究问题不是「Sketch 能否生成更好的图」。

它问的是：临时视觉脚手架（T2：Sketch → Interpret Sketch → 人改写 prompt）能否让用户**用自然语言更精确地表达想改的视觉内容**。

生成 API 的输入必须始终是 **当前图 + 被试自己的文字**。Sketch 不得进入 API。

组间（between-subjects）：

| 组 | `group` | 7 题结构 | middle 块 |
| --- | --- | --- | --- |
| scaffold | 1 | T0×1 + T1×2 + T2×2 + T3×2 | Sketch 中介 |
| control | 0 | T0×1 + T1×4 + T3×2 | 额外纯文本练习 T1′ |

任务 `block`：`baseline`（T0）/ `early`（前两道 T1）/ `middle`（T2 或 T1′）/ `transfer`（T3）。

论文对照（**禁止**用 T2>T1 单独声称脚手架有效）：

```text
Primary  = (Scaffold middle − Scaffold early) − (Control middle − Control early)
Transfer = Scaffold T3 − Control T3
```

主精度指标是专家编码的 **P_norm**。时间、点击、copy_ratio 是交互成本或过程变量，**不能当成认知提升**。高 copy 不自动剔除。

---

## 2. 样本纳入（先于任何效应）

### 2.1 11 包都是独立会话

| 检查 | 结果 |
| --- | --- |
| zip 数 | 11 |
| `started_at` 唯一 | 11/11，无整包复制 |
| 填写 ID 碰撞 | **5 包都填了 `P001`**（zip：P001/P002/P003/P010/P011）。开始时间、刺激 pattern、组别均不同，**不是同一人同一场** |
| P011 vs P001 | 不同场：pattern B vs C；08:11 vs 08:29 |
| Sketch 进入 API | **0/11**。全部 `sketch_sent=false`，`api_input=image+text`，`input_sketch_snapshot_id` 空 |
| 7 题都有 `ended_at` | 11/11 |
| `expert_ratings.csv` / `P_norm` | **全部空**。主指标无法算 |

填写 ID 碰撞只影响日志对齐，不减少独立会话数。论文表请用 zip 标签或日后重编码的匿名 ID。

### 2.2 正式效力样本 vs 敏感度样本

协议：`export_ready=true` 仅当 study-level flags 全过 **且** 场次 complete。不完整场次不是正式效力样本。旧协议 / 缺 validation 的包不作正式效力。

| 包 | 组 | 协议版本 | export_ready | 正式效力 | 排除理由 |
| --- | --- | --- | --- | --- | --- |
| P001 | scaffold | v2 | 是 | **是** | 并发失败 3 次（过程噪声，未排除） |
| P002 | control | v2 | 是 | **是** | 并发 2 + 内容风控 2；有超长墙钟 |
| P003 | scaffold | v2 | **否** | 否 | `timing_complete` 未闭合。7 题写完，进敏感度 |
| P004 | scaffold | **v1** | 表内为 1，但无 `validation.json` | 否 | 缺 event_log / validation / session_recovery；T0 仍带 target spec（现行协议禁止） |
| P005 | control | v2 | 是 | **是** | |
| P006 | control | v2 | 是 | **是** | |
| P007 | control | v2 | 是 | **是** | 1 次并发；early 有超长墙钟 |
| P008 | control | v2 | 是 | **是** | 1 次并发 |
| P009 | scaffold | v2 | 是 | **是** | 4 次并发；T2 超长墙钟 |
| P010 | scaffold | v2 | 是 | **是** | |
| P011 | scaffold | v2 | 是 | **是** | 3 次并发；T2 超长墙钟 |

**正式效力 n=9：scaffold 4（P001, P009, P010, P011）/ control 5（P002, P005, P006, P007, P008）。**

敏感度（全部 7 题结束的独立场）：n=11，scaffold 6 / control 5。

Scaffold 组 T2：11 包里凡有 T2 的，均同时有 sketch 操作、Auto Prompt、成功生成，**T2 loop 形态成立**（P004 虽缺 event_log，任务表与 auto_prompts 仍能对上）。Control 组无 T2，符合设计。

---

## 3. 主指标：现在还不能写 Primary / Transfer 的精度结论

`tasks.csv` 的 `P_norm` / `P_initial` / `P_final` / `delta_P` 全空。  
`expert_ratings.csv` 只有空文件。

没有 0–3 标准编码，就没有论文规定的主 DV。  
下面所有数字都是 **次级 / 过程 / 成本**。它们可以进 Methods 的过程检查和 Exploratory 段，**不能替代 P_norm 去声称脚手架有效或无效**。

---

## 4. 次级指标上的论文对照（正式 n=9）

每人先对 early / middle / transfer 两道题取均值，再算组间。  
n 太小，p 值和 bootstrap 区间只作描述，不作推断。

### 4.1 Self-alignment（1–7，自评「我表达清楚了没有」）

| | early | middle | transfer | 个人 Δ(middle−early) |
| --- | --- | --- | --- | --- |
| Scaffold (n=4) | 4.62 | 4.88 | 5.25 | 0.0, 1.5, 0.0, −0.5 |
| Control (n=5) | 5.00 | 5.80 | 5.10 | 2.0, 2.5, 0.0, −2.0, 1.5 |

```text
Primary  = 0.25 − 0.80 = −0.55
Transfer = 5.25 − 5.10 = +0.15
```

含义：middle 相对 early，**对照组自评涨得更多**。这与「脚手架提高表达精度」的方向相反，但：

- 量尺有天花板（多人 6–7）
- 自评 ≠ 专家 P_norm
- 控制组 middle 是更多 T1 练习，脚手架 middle 是更重的 T2 操作，负荷不同
- n=4 vs 5，区间覆盖 0（bootstrap 约 −1.85 ~ 0.95）

敏感度 n=11 时 Primary 更负（约 −0.80），Transfer 仍接近 0。

### 4.2 Result-alignment（1–7，自评「生成图像不像我想的」）

正式样本：

```text
Primary  = 0.75 − 0.80 = −0.05
Transfer = 5.12 − 5.00 = +0.12
```

两组 middle 相对 early 的涨幅几乎一样。Transfer 可忽略。同样不能当精度证据。

### 4.3 时间（交互成本，不是认知提升）

墙钟 `total_task_time_ms` 被几场「把标签页挂很久」拉爆：

| 包 | 异常题 | 墙钟 | 该题生成等待 |
| --- | --- | --- | --- |
| P007 | T1 early | ~4.7 h | ~2.5 min |
| P002 | T1′ middle | ~2.7 h | ~23 s |
| P011 | T2 middle | ~2.0 h | ~38 s |
| P009 | T2 middle | ~1.7 h | ~40 s |

等待时间正常、墙钟离谱 → 离开座位 / 切走，不是「想得更久」。均值不可用。中位数：

| 墙钟中位数 | early | middle | transfer |
| --- | --- | --- | --- |
| Scaffold | 6.5 min | 42 min | 4.4 min |
| Control | 4.5 min | 4.3 min | 3.1 min |

去掉单题 ≥30 min 后，脚手架 middle 仍更长（T2 含画草图）：个人 Δ 约 +1~16 min，控制组多为变短。这符合「脚手架更贵」，**符合协议把时间当成本**，不能写成「学得更好」。

生成等待两组接近（middle 约 1 min 量级），不是主差异来源。  
T2 草图编辑时间才是脚手架成本：有人 ~17 min，有人（P011 一道 T2）墙钟里叠了很长时间。

### 4.4 Copy ratio（仅 T2；允许复制 Auto Prompt）

正式样本 8 道 T2：均值 0.12，中位数 0。多数 0；两道约 0.33 与 0.60。  
敏感度里 P003 有一道 copy=1.0（整段粘贴）。按协议 **不剔除**。

### 4.5 字数（探索性，不是 P_norm）

脚手架 final prompt 平均更长（early 51 vs 28 字；middle 61 vs 19；T3 42 vs 24）。字数 ≠ 可执行精度。只说明脚手架组写得更长，不能当主结果。

### 4.6 满意轮次

Scaffold middle 略多于 control（2.75 vs 1.60），T3 也略多（1.88 vs 1.30）。T2 被协议要求至少走完 loop，轮次偏多是设计 + 并发重试，不是「更努力所以更好」。

---

## 5. 过程检查（可以进论文 Methods / Limitations）

### 5.1 生成链与并发

11 包合计成功生成 108、失败 16。失败里 **14 次 API Concurrent Limit**，2 次文本风控（均在 P002）。

并发失败会把 `generation_input_chain_valid=0` 记在失败那一轮，但 validation 仍给若干包 `export_ready=true`（只约束成功链）。P001/P009/P011 与 P002 开始时间互相重叠，和并发撞车一致。

这些失败：

- 抬高 T2 的 `number_of_rounds` 和墙钟
- 中断「当前图 → 下一轮」的体验
- **不应**当成效样本里的「多轮 refinement」

重试上线前的场次，论文应在 Limitations 写清。

### 5.2 协议版本

P004 是 `formal-between-v1`，T0 仍带 researcher target（现行协议 T0 必须为空）。7 题做完、有自评，可作 v1 过程参考，**不要放进正式 between-v2 效力表**。

P003 完成问卷但 `timing_complete=false` → `export_ready=false`。T0 只写了约 9 字 / 21 秒，像赶场。敏感度可留，正式效力不留。

### 5.3 刺激与分组

正式 9 人 assignment pattern：A×2（皆 control）、B×2（皆 scaffold）、C×5（scaffold 2 / control 3）。分层旋转看起来在工作，但 n 不够谈平衡。组别由 `group`/`experimental_group` 读取，没有用 `task_id` 反推。

---

## 6. 现在能写、不能写

**可以写：**

- 11 场独立完整 7 题；正式效力 9 场（S4 / C5）
- Sketch 从未进入生成 API，满足分离假设
- T2 在脚手架组可重建 loop
- 主 DV（P_norm）尚未编码，精度结论 pending
- 自评 Likert 上 Primary 不支持「脚手架 > 控制」；Transfer 接近 0
- T2 明显更贵（时间）；并发失败是重要过程噪声
- 填写 ID 大量撞车，分析必须用会话指纹 / zip 标签

**不能写：**

- 「脚手架提高了（或降低了）表达精度」——没有 P_norm
- 「T2 分数高于 T1，所以脚手架有效」——协议明文禁止
- 「时间更长 = 想得更清楚」
- 「copy 低/高说明学得好/差」
- 任何 p<.05 的推断声称（n=4/5，多重比较，墙钟污染）

---

## 7. 建议的下一步（按论文优先级）

1. **专家编码 P_norm**（0–3 可执行标准，不是专业词表）。有了 P_norm 再重跑第 4 节同一套 Primary / Transfer。
2. 收 **P012**，并修被试填写 ID（不要默认 P001）。
3. 效力表默认 **n=9**；P003/P004 放附录敏感度。
4. 时间模型用 **log(墙钟) 或剔除离开座位的题**，并并列报告生成等待 / 草图时间。
5. Limitations 写：Jimeng 并发上限、内容风控、v1 导出缺文件、Likert 天花板。
6. 编码完成前，Results 只放过程描述 + 自评探索，Abstract 不要报效应量。

复现：`python3 CHItest/scripts/analyze_packets.py`（读本地解压目录，不把 zip 提交进 git）。
