# 辛向阳 · 进化日志

## v0.2.0（2026-06-17）

**类型**：MAJOR — 私域深采更新

**变更内容**：
- 完成私域深采重跑：30 个附件全文深读（19 篇论文 PDF + 10 篇思想动态 PDF + 1 份英文 DOCX）
- **新增核心理论框架**：
  - BEV-E 四维要素模型（S-pri-001 全文提取）— Behavior / Environment / Value / Experience
  - A-C/E-M 四象限服务设计定位框架（S-pri-005 全文提取）— 附加价值-核心主体 × 效率-意义
  - 服务设计五要素——戏剧"五位一体"（S-pri-008 全文提取）
- **新增学术成果与理念**：
  - 「从设计师到公民」理论转向（S-pri-028 全文 + web_search）
  - 「心理草绘」理论（S-pri-029 全文，2025.12 最新成果）
  - 「顶天立地」学科发展理念（2026.01 就职发言）
  - 「从知识渊博到创造知识」教育哲学（S-pri-024 全文）
  - 「阅读、理解和引领趋势」方法论（S-pri-026 全文）
- **新增源材料**：
  - 38 场国际演讲完整历史（S-pri-020 英文简历独家提取）
  - 完整英文简历（含教育、工作、兼职、获奖、演讲、评审经历）
  - 22 篇指导论文全景（覆盖医疗、金融、法律、犯罪学等）
- **更新文件**（全部 11 个文件覆盖写入）：
  - `.workbuddy-plugin/plugin.json` — v0.2.0，更新 description/quickPrompts/tags
  - `agents/xin-xiangyang.md` — 更新术语/金句/价值观/诚实边界/路由表
  - `references/persona-deep.md` — 新增 BEV-E/A-C/E-M/心理草绘/顶天立地/从设计师到公民
  - `references/sources-index.md` — 公域 15 条 + 私域 30 条 S-pri-xxx 编号
  - `references/expert-profile.md` — A-H 八路全面更新
  - `references/README.md` — 更新版本号
  - `skills/researcher/SKILL.md` — 新增模型 4/5/6（BEV-E/A-C/E-M/戏剧五位一体）+ 心理草绘启发式
  - `skills/advisor/SKILL.md` — 新增顶天立地/从知识渊博到创造知识
  - `examples/demo-conversations.md` — 更新对话 4/6/7（融入 BEV-E/顶天立地/心理草绘）
  - `evolution-log.md` — 本文件
  - `README.md` — 更新版本号与能力覆盖

**已知局限**：
- 16 个视频文件未读取二进制内容（仅记录了标题和主题）
- 咨询项目的详细过程文档缺失（仅有客户名单）
- 国际学术引用数据不完整
- 课堂实录与教学风格缺失
- 同行评议缺失

---

## v0.1.0（2026-06-17）

**类型**：MAJOR — 初始版本

**变更内容**：
- 完成 27 条公域 + 89 entries 私域来源的八路采集与蒸馏
- 建立常驻人格骨架 `agents/xin-xiangyang.md`（<4000字，中文节标题）
- 生成 2 个核心 Skill：`researcher`（设计理论研究）、`advisor`（职业与学术顾问）
- 生成深度人格档案 `references/persona-deep.md`（含诚实边界 + 局限性）
- 生成完整素材索引 `references/sources-index.md`
- 生成八路采集画像精华 `references/expert-profile.md`
- 生成 7 组示范对话 `examples/demo-conversations.md`
- 生成插件 manifest `.workbuddy-plugin/plugin.json`（16 字段，categoryId=12-IndustryConsultant）

**已知局限**：
- 课堂实录与教学风格缺失
- 具体咨询项目的设计过程文档缺失
- 国际学术引用数据不完整
- 同行评议缺失
- 私域素材中的论文全文未逐篇精读
