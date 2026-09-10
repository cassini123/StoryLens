# CHItest

CHI 2027 实验系统。最终协议：组间对照 + 草图只作语言脚手架，不进入最终生图。

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
| `#/` | 首页：Participant 直接进入；Researcher 需登录（Mickey / Cassini，密码 12345678） |
| `#/participant` | 被试：手输编号，1/2 随机分组。导出 `group`：0 = 四个 T1，1 = T1 T1 T2 T2 |
| `#/participant?short=1` | 干跑：scaffold 为 T0/T1/T2/T3，control 为 T0/T1/T1′/T3 |
| `#/expert` | 四专家盲评（需 Researcher 登录）。只评修改题最终文字：五个 1–7 分（可理解性、空间具体性、动作具体性、可执行性、总体精确度）+ Reconstructable（是/否）。界面不显示条件、阶段、Auto Prompt、Sketch、目标修改说明；T0 不进入 |
| `#/coding` | 研究者按 active dimensions 编码（需登录） |
| `#/export` | 全部正式表打一个 zip（需登录）。被试完成页也会打自己的包 |

数据在当前浏览器。存储键 `chitest.store.v8`。关闭浏览器后会恢复同一个 session，不会另开一场。旧键（含 P001 试跑）不会自动接上；未完成场次 `completion_status = incomplete`，不能当作正式效力样本。

---

## 2. 两组

不要告诉被试自己在哪一组。

- **1 / scaffold**：T0×1 + T1×2 + T2×2 + T3×2
- **0 / control**：T0×1 + T1×4 + T3×2

中间两题才是条件差异。T3 两组都没有草图，用来看撤掉脚手架后的近迁移。

---

## 3. 被试流程

**T0** 观察当前画面，写下读到的视觉信息。无 AI、无草图。

**T1** 描述你认为下一个镜头里会发生的内容 → Generate（当前图+文字；第 2 轮起用上一张生成图）→ 看差异 → 改文字再生成。最多 3 轮。

**T2（仅 scaffold）** 草图始终在主界面。移动/缩放/镜头等操作只记 `sketch_interaction`。点「生成文字解释」后才会根据当前草图生成一段只读 Auto Prompt。你可以照抄、改一部分，或完全重写。然后再 Generate。第二次生成用的是上一张生成图 + 你修改后的文字，**不把草图送进 API**。没走完「解释 → 改写 → 生成」不能点满意。

**T3** 新图，纯文字，与 T1 相同。无草图、无自动描述。

随时可以 **满意，下一题**。T1/T2/T3 结束前有两道 1–7 自评（最终表达是否符合本意、生成结果是否符合本意），只作次要分析。

---

## 4. 生图 API

`POST /api/jimeng/`。所有生成轮次：当前图 + 用户最终描述。T2 草图只用于自动语言，不作为条件图。
