#!/usr/bin/env python3
"""Patch storylens-generator.html: floating skill picker + expert skillPath."""

from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "assets" / "storylens-generator.html"

SKILL_CSS = """
/* ── SKILL FLOAT PICKER (主 Skill 能力) ── */
.skill-float{position:fixed;bottom:74px;right:88px;z-index:399;display:flex;flex-direction:column;align-items:center;gap:6px;}
.skill-float-label{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--fg);background:var(--bg);border:2px solid var(--fg);padding:1px 6px;box-shadow:2px 2px 0 var(--fg);}
.skill-float-btns{display:flex;flex-direction:column;gap:8px;}
.skill-float-btn{width:44px;height:44px;border-radius:50%;border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--bg);transition:all .12s;position:relative;}
.skill-float-btn:hover{box-shadow:1px 1px 0 var(--fg);transform:translate(1px,1px);}
.skill-float-btn.selected{box-shadow:0 0 0 3px var(--cyan),2px 2px 0 var(--fg);transform:scale(1.06);}
.skill-float-btn .skill-tip{position:absolute;right:52px;top:50%;transform:translateY(-50%);font-size:9px;font-weight:900;white-space:nowrap;background:var(--fg);color:var(--bg);padding:2px 6px;border:2px solid var(--fg);opacity:0;pointer-events:none;transition:opacity .12s;}
.skill-float-btn:hover .skill-tip{opacity:1;}
"""

SKILL_HTML = """
<div class="skill-float" id="skillFloat">
  <div class="skill-float-label">StoryLens</div>
  <div class="skill-float-btns" id="skillFloatBtns"></div>
</div>
<div class="ai-widget">
"""

SKILL_JS = """
// ══════════════════════════════════════════════
//  MAIN SKILL MODES (悬浮挂件 · 与 SKILL.md 同步)
// ══════════════════════════════════════════════
const SKILL_MODES = [
  {
    id:'game-design', name:'游戏设计', icon:'🎮', color:'var(--cyan)',
    title:'游戏设计咨询 · MDA / 核心循环',
    chips:['核心循环怎么设计？','MDA框架分析','心流与难度曲线','玩法机制评审'],
    prefix:'【游戏设计模式】'
  },
  {
    id:'storylens', name:'分镜创作', icon:'🎬', color:'var(--yellow)',
    title:'分镜创作 · 视觉叙事',
    chips:['分析当前所有分镜的维度占比','当前分镜的镜头序列分析','分镜叙事节奏和情感弧线','生成优化的 prompt 建议'],
    prefix:'【分镜创作模式】'
  },
  {
    id:'serious-games', name:'严肃游戏', icon:'📚', color:'var(--green)',
    title:'严肃游戏 · 游戏化教学',
    chips:['学习成果如何游戏化？','核心学习循环设计','有趣与有效的平衡','评估指标怎么定？'],
    prefix:'【严肃游戏模式】'
  },
  {
    id:'ai-create', name:'AI生图', icon:'🎨', color:'var(--orange)',
    title:'AI辅助创作 · Prompt / LoRA',
    chips:['Prompt 怎么写更好？','五种风格怎么选？','LoRA 训练流程','即梦生图引擎配置'],
    prefix:'【AI创作模式】'
  }
];

function renderSkillFloatBar() {
  var container = document.getElementById('skillFloatBtns');
  if (!container) return;
  container.innerHTML = SKILL_MODES.map(function(s) {
    var sel = appState.activeSkillMode === s.id ? ' selected' : '';
    return '<button type="button" class="skill-float-btn' + sel + '" id="skill-' + s.id + '" onclick="selectSkillMode(\'' + s.id + '\')" title="' + s.name + '" style="background:' + s.color + ';">' +
      s.icon + '<span class="skill-tip">' + s.name + '</span></button>';
  }).join('');
}

function getActiveSkillMode() {
  return SKILL_MODES.find(function(s) { return s.id === appState.activeSkillMode; }) || SKILL_MODES[1];
}

function selectSkillMode(id) {
  appState.activeSkillMode = id;
  var skill = getActiveSkillMode();
  if (!appState.activeExpert) {
    document.getElementById('aiTitle').textContent = 'StoryLens · ' + skill.name;
    document.getElementById('aiHeaderAvatar').textContent = skill.icon;
    document.getElementById('aiHeaderAvatar').style.background = skill.color;
    document.getElementById('aiStatus').textContent = skill.title;
    updateSkillChips(skill);
  }
  renderSkillFloatBar();
}

function updateSkillChips(skill) {
  var chips = document.getElementById('suggestionChips');
  if (!chips || !skill) return;
  chips.innerHTML = skill.chips.map(function(c) {
    return '<div class="chip" onclick="askQuestion(\'' + c.replace(/'/g, "\\'") + '\')">' + c + '</div>';
  }).join('');
}

function refreshSuggestionChips() {
  var expert = getActiveExpert();
  if (expert) updateExpertChips(expert);
  else updateSkillChips(getActiveSkillMode());
}

"""

EXPERT_SKILLPATH_OLD = "    id:'xinxiangyang', name:'辛向阳', icon:'🌻', color:'var(--yellow)',"
EXPERT_SKILLPATH_NEW = "    id:'xinxiangyang', name:'辛向阳', icon:'🌻', color:'var(--yellow)',\n    skillPath:'专家skill/xin-xiangyang',"


def patch():
    content = HTML.read_text(encoding="utf-8")
    original = len(content)

    if ".skill-float{" not in content:
        content = content.replace(".ai-widget{position:fixed;", SKILL_CSS + "\n.ai-widget{position:fixed;")
        print("✓ Skill float CSS inserted")

    if 'id="skillFloat"' not in content:
        content = content.replace("<div class=\"ai-widget\">", SKILL_HTML)
        print("✓ Skill float HTML inserted")

    if "SKILL_MODES" not in content:
        content = content.replace(
            "// ══════════════════════════════════════════════\n//  TT EXPERT COLLABORATION",
            SKILL_JS + "\n// ══════════════════════════════════════════════\n//  TT EXPERT COLLABORATION",
        )
        print("✓ Skill modes JS inserted")

    if "activeSkillMode" not in content:
        content = content.replace(
            "  activeExpert:null",
            "  activeSkillMode:'storylens',\n  activeExpert:null",
        )
        print("✓ appState.activeSkillMode added")

    if "skillPath:'专家skill/xin-xiangyang'" not in content:
        content = content.replace(EXPERT_SKILLPATH_OLD, EXPERT_SKILLPATH_NEW)
        content = content.replace(
            "    id:'louyongqi', name:'娄永琪', icon:'👓', color:'var(--blue)',",
            "    id:'louyongqi', name:'娄永琪', icon:'👓', color:'var(--blue)',\n    skillPath:'专家skill/lou-yongqi-perspective',",
        )
        content = content.replace(
            "    id:'lihejin', name:'李何槿', icon:'🍐', color:'var(--green)',",
            "    id:'lihejin', name:'李何槿', icon:'🍐', color:'var(--green)',\n    skillPath:'专家skill/li-hejin',",
        )
        content = content.replace(
            "    id:'liuzhejun', name:'柳喆俊', icon:'6', color:'var(--orange)',",
            "    id:'liuzhejun', name:'柳喆俊', icon:'6', color:'var(--orange)',\n    skillPath:'专家skill/liu-zhe-jun',",
        )
        print("✓ Expert skillPath fields added")

    old_deselect = """    updateExpertChips(null);
    addMessage('ai', '已切换回「StoryLens」默认模式。');"""
    new_deselect = """    var skill = getActiveSkillMode();
    document.getElementById('aiTitle').textContent = 'StoryLens · ' + skill.name;
    document.getElementById('aiHeaderAvatar').textContent = skill.icon;
    document.getElementById('aiHeaderAvatar').style.background = skill.color;
    document.getElementById('aiStatus').textContent = skill.title;
    refreshSuggestionChips();
    addMessage('ai', '已切换回「StoryLens · ' + skill.name + '」模式。');"""
    if "refreshSuggestionChips();" not in content.split("function selectExpert")[1][:800] if "function selectExpert" in content else "":
        content = content.replace(old_deselect, new_deselect)
        print("✓ Expert deselect restores skill mode")

    if "renderSkillFloatBar();" not in content:
        content = content.replace(
            "renderExpertAvatars();\nrenderDraftBoard();",
            "renderSkillFloatBar();\nrenderExpertAvatars();\nselectSkillMode('storylens');\nrenderDraftBoard();",
        )
        print("✓ Init renderSkillFloatBar added")

    if "localStorage.getItem('jimeng_ak')" not in content:
        jimeng_ls = """
  try {
    var savedAk = localStorage.getItem('jimeng_ak');
    var savedSk = localStorage.getItem('jimeng_sk');
    if (savedAk && akInput) akInput.value = savedAk;
    if (savedSk && skInput) skInput.value = savedSk;
  } catch(e) {}
"""
        content = content.replace(
            "  var akInput = document.getElementById('jimengAccessKey');\n  var skInput = document.getElementById('jimengSecretKey');\n  fetch(url.value",
            "  var akInput = document.getElementById('jimengAccessKey');\n  var skInput = document.getElementById('jimengSecretKey');" + jimeng_ls + "\n  fetch(url.value",
        )
        content = content.replace(
            "        if (sk) appState.jimeng.secretKey = sk;\n        var ready = ak && sk || data.credentials;",
            "        if (sk) appState.jimeng.secretKey = sk;\n        try { if (ak) localStorage.setItem('jimeng_ak', ak); if (sk) localStorage.setItem('jimeng_sk', sk); } catch(e) {}\n        var ready = ak && sk || data.credentials;",
        )
        print("✓ Jimeng localStorage persistence added")

    HTML.write_text(content, encoding="utf-8")
    print(f"\nDone. {original} → {len(content)} bytes")


if __name__ == "__main__":
    patch()
