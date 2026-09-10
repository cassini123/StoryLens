# N=20 按论文协议的数据分析

数据：`CHItest/data/participants/` 中的 20 个 zip（P001–P020）。P012 是 2 字节空文件，没有会话。  
分析单位：zip 标签 `P001`…`P020`，**不以填写的 participant_id 去重**。  
本文只报告汇总与过程检查，不含原文 prompt、截图或可识别昵称。

对照协议：`CHItest/docs/experiment-protocol.md`。  
人表：`CHItest/docs/n20-person-table.csv`。  
复现：`CHITEST_PACKET_DIR=/path/to/zips python3 CHItest/scripts/analyze_packets.py`

---

## 1. 论文要回答什么

研究问题不是「Sketch 能否生成更好的图」。

它问的是：临时视觉脚手架（T2：Sketch → Interpret Sketch → 人改写 prompt）能否让用户**用自然语言更精确地表达想改的视觉内容**。

生成 API 的输入必须始终是 **当前图 + 被试自己的文字**。Sketch 不得进入 API。

| 组 | `group` | 7 题结构 | middle 块 |
| --- | --- | --- | --- |
| scaffold | 1 | T0×1 + T1×2 + T2×2 + T3×2 | Sketch 中介 |
| control | 0 | T0×1 + T1×4 + T3×2 | 额外纯文本练习 T1′ |

```text
Primary  = (Scaffold middle − Scaffold early) − (Control middle − Control early)
Transfer = Scaffold T3 − Control T3
```

主精度指标是专家编码的 **P_norm**。时间、点击、copy_ratio、自评是交互成本或过程变量，**不能当成认知提升**。高 copy 不自动剔除。

---

## 2. 样本纳入（先于任何效应）

### 2.1 20 个文件 ≠ 20 场可用会话

| 检查 | 结果 |
| --- | --- |
| zip 数 | 20 |
| 可解析会话 | **19**。P012 为空包 |
| `started_at` 唯一 | 19/19，无整包复制 |
| 填写 ID 碰撞 | **10 包都填了 `P001`**。开始时间、刺激 pattern、组别均不同，**不是同一人同一场** |
| Sketch 进入 API | **0/19**。全部 `sketch_sent=false`，`api_input=image+text`，`input_sketch_snapshot_id` 空 |
| 7 题都有 `ended_at` | 17/19。P019 缺第 2 道 T2；P020 两道 T2 都未结束 |
| `expert_ratings.csv` / `P_norm` | **全部空**。主指标无法算 |

论文表请用 zip 标签。填写 ID 只作实验室对照。

### 2.2 正式效力 vs 敏感度

协议：`export_ready=true` 仅当 study-level flags 全过 **且** 场次 complete。旧协议 / 缺 validation / 时间戳未闭合 / 未做完 7 题，都不是正式效力样本。

| 包 | 组 | 协议 | export_ready | 正式效力 | 排除理由 |
| --- | --- | --- | --- | --- | --- |
| P001 | scaffold | v2 | 是 | **是** | 并发失败 3（过程噪声，未排除） |
| P002 | control | v2 | 是 | **是** | 并发 2；middle 墙钟异常长 |
| P003 | scaffold | v2 | 否 | 否 | `timing_complete`；有 `generation_recovery`。7 题写完，进敏感度 |
| P004 | scaffold | **v1** | 表内为 1，无 `validation.json` | 否 | 旧协议；T0 仍带 target spec |
| P005 | control | v2 | 是 | **是** | |
| P006 | control | v2 | 是 | **是** | |
| P007 | control | v2 | 是 | **是** | 1 次并发；early 墙钟异常长 |
| P008 | control | v2 | 是 | **是** | 1 次并发 |
| P009 | scaffold | v2 | 是 | **是** | 4 次并发；T2 墙钟异常长 |
| P010 | scaffold | v2 | 是 | **是** | |
| P011 | scaffold | v2 | 是 | **是** | 3 次并发；T2 墙钟异常长 |
| P012 | — | — | — | 否 | 空 zip |
| P013 | scaffold | v2 | 是 | **是** | |
| P014 | scaffold | v2 | 是 | **是** | |
| P015 | control | v2 | 是 | **是** | |
| P016 | scaffold | v2 | 是 | **是** | 1 次并发 |
| P017 | scaffold | v2 | 否 | 否 | `timing_complete`；有 `generation_recovery`。进敏感度 |
| P018 | scaffold | v2 | 否 | 否 | `timing_complete`。进敏感度 |
| P019 | scaffold | v2 | 否 | 否 | 第 2 道 T2 未结束（6/7） |
| P020 | scaffold | v2 | 否 | 否 | 两道 T2 未结束（5/7），但两道 T3 已做完 |

**正式效力 n=13：scaffold 7（P001, P009–P011, P013, P014, P016）/ control 6（P002, P005–P008, P015）。**

敏感度（7 题都结束）：n=17，scaffold 11 / control 6。

相对 N=11：正式样本从 9（S4/C5）扩到 13（S7/C6）。对照组只多了 P015；脚手架组多了 P013、P014、P016。P017–P020 都不能进正式效力。

已结束的 T2（脚手架组）都同时有草图操作、Auto Prompt、成功生成，T2 loop 形态成立。P020 两道 T2 都没点完，loop 无法评。Control 无 T2，符合设计。

---

## 3. 主指标：仍不能写精度上的 Primary / Transfer

`tasks.csv` 的 `P_norm` / `P_initial` / `P_final` / `delta_P` 全空。  
`expert_ratings.csv` 只有空表。

没有 0–3 专家编码，就没有协议规定的主 DV。  
下面数字都是 **次级 / 过程 / 成本**。可以进 Methods 的过程检查和 Exploratory，**不能替代 P_norm 去声称脚手架有效或无效**。

---

## 4. 次级指标上的论文对照（正式 n=13）

每人先对 early / middle / transfer 两道题取均值，再算组间。  
n 仍小，bootstrap 区间只作描述，不作推断。

### 4.1 Self-alignment（1–7，「我表达清楚了没有」）

| | early | middle | transfer | 个人 Δ(middle−early) |
| --- | --- | --- | --- | --- |
| Scaffold (n=7) | 5.07 | 4.93 | 4.79 | 0.0, 1.5, 0.0, −0.5, 0.0, −0.5, −1.5 |
| Control (n=6) | 4.92 | 5.58 | 4.92 | 2.0, 2.5, 0.0, −2.0, 1.5, 0.0 |

```text
Primary  = −0.14 − 0.67 = −0.81
Transfer = 4.79 − 4.92 = −0.13
```

Hedges g（个人 Δ）约 −0.58；bootstrap 约 −2.10 … 0.50，覆盖 0。

含义与 N=11 相同：middle 相对 early，**对照组自评涨得更多**。这与「脚手架提高表达精度」的方向相反，但：

- 量尺有天花板
- 自评 ≠ 专家 P_norm
- 控制组 middle 是更多 T1 练习，脚手架 middle 是更重的 T2
- n=7 vs 6，区间覆盖 0

敏感度 n=17 时 Primary 仍约 −0.76，Transfer ≈ 0。

### 4.2 Result-alignment（1–7，「生成图像不像我想的」）

```text
Primary  = 0.36 − 0.67 = −0.31
Transfer = 5.36 − 4.83 = +0.52
```

Primary 仍略负。Transfer 这次脚手架 T3 自评略高（5.36 vs 4.83），bootstrap 覆盖 0（约 −1.7 … 1.1）。同样不能当精度证据。

### 4.3 时间（交互成本）

墙钟被离开标签页拉爆，均值不可用：

| 包 | 异常题 | 墙钟 |
| --- | --- | --- |
| P007 | T1 early | ~4.7 h |
| P002 | T1′ middle | ~2.7 h |
| P011 | T2 middle | ~2.0 h |
| P009 | T2 middle | ~1.7 h |
| P020 | T0（非正式） | ~38 min |

去掉单题 ≥30 min 后：

| 墙钟（秒，mean / median） | early | middle | transfer |
| --- | --- | --- | --- |
| Scaffold | 306 / 212 | 566 / 451 | 427 / 220 |
| Control | 284 / 263 | 130 / 115 | 249 / 205 |

```text
Primary（去 30min 异常）≈ +413 s（脚手架 middle 更贵）
Transfer ≈ +178 s
```

这符合协议把时间当成本，不能写成「学得更好」。T2 含画草图，middle 更长是设计预期。

生成失败多数是并发/限流（P001/P002/P009/P011 等）。失败不占轮次。P003、P017 有 `generation_recovery`，对应手机点生成后请求挂住、刷新才离开灰屏的那类事故。

---

## 5. 现在能写进论文的 / 还不能写的

**能写**

- 操作检查通过：Sketch 从未进 API；v2 场次顺序正确；已结束的 T2 都走完 Sketch → Interpret → 生成。
- 正式效力样本 n=13（S7/C6），敏感度 n=17。
- 时间：脚手架 middle 交互更贵。
- 自评：不能支持「脚手架提高表达精度」；方向甚至相反，且 CI 覆盖 0。

**还不能写**

- 任何基于 P_norm 的 Primary / Transfer 功效结论。
- 把自评或时长当成认知提升。

**下一步（比再收 20 人更急）**

1. 专家按 0–3 标准给正式 n=13（至少）打 `P_norm`。没有它就没有主分析。
2. P012 重新导出。P019 / P020 若还在同一浏览器，可让他们做完未结束的 T2 再导出；否则记为不完整，不要塞进效力样本。
3. 填写 ID 不要默认 `P001`。组间收集目前偏脚手架（13 vs 6 包），正式样本已接近平衡（7 vs 6），后面优先补控制组完整场。
