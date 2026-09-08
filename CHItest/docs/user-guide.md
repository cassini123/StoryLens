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
| `#/expert` | 四专家盲评（需 Researcher 登录） |
| `#/coding` | 研究者按 active dimensions 编码（需登录） |
| `#/export` | 全部正式表打一个 zip（需登录）。被试完成页也会打自己的包 |

数据在当前浏览器。存储键 `chitest.store.v7`，旧进度（含 P001 试跑）不会自动接上，也不当作正式结果。

---

## 2. 两组

不要告诉被试自己在哪一组。

- **1 / scaffold**：T0×1 + T1×2 + T2×2 + T3×2
- **0 / control**：T0×1 + T1×4 + T3×2

中间两题才是条件差异。T3 两组都没有草图，用来看撤掉脚手架后的近迁移。

---

## 3. 被试流程

**T0** 观察当前画面，写下读到的视觉信息。无 AI、无草图。

**T1** 写希望生成的画面 → Generate（当前图+文字）→ 看差异 → 改文字再生成。最多 3 轮。

**T2（仅 scaffold）** 草图始终在主界面。改草图后，左侧只读显示「AI 对你草图变化的文字描述」。右侧「你可以修改的生成描述」才是生图用的文字。最终 API 只送当前图 + 用户描述，**不送草图**。

**T3** 新图，纯文字，与 T1 相同。无草图、无自动描述。

随时可以 **满意，下一题**。T1/T2/T3 结束前有两道 1–7 自评（最终表达是否符合本意、生成结果是否符合本意），只作次要分析。

---

## 4. 生图 API

`POST /api/jimeng/`。所有生成轮次：当前图 + 用户最终描述。T2 草图只用于自动语言，不作为条件图。
