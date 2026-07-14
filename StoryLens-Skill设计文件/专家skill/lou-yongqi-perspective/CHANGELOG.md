# Changelog

## v0.1.1 — 2026-06-03

**WorkBuddy / CodeBuddy 插件适配（零功能改动）**

- 新增 `.workbuddy-plugin/plugin.json`：插件元数据，遵循 WorkBuddy expert 插件规范（与 jiang-he 插件结构对齐）
- 新增 `settings.json`：声明 agent 入口
- 新增 `avatars/` 占位目录（后续放 `lou-yongqi.png`）
- 子 skill 的 `PROMPT.md` 重命名为 `SKILL.md`，匹配平台标准 skill 文件夹规范（`skills/<name>/SKILL.md`）
- 主 SKILL.md / persona.md / router.md / 子 skill 内容**未做任何修改**——人格、心智模型、路由规则、demo 全部保留

## v0.1.0 — 2026-05-12

- 蒸馏首版：persona + 4 核心 skill（researcher / educator / methodologist / advisor）+ 3 子 skill（critique / workshop-designer / career-compass）+ router + 9 组 demo + references 索引
- 基于阿特拉斯 S1–S16 + LX1-70 + LX2-20 + LX3-10（共 102 条可验证来源）+ 艾瑞丝 6 份结构化 reference 构建
