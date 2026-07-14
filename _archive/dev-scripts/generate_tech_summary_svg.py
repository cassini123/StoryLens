#!/usr/bin/env python3
"""Generate editable tech-summary SVGs: brutalism + figma styles."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def brutalism_svg() -> str:
    return '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 3200" width="2400" height="3200" font-family="Inter, system-ui, -apple-system, sans-serif">
  <defs>
    <style>
      .title { font-size: 52px; font-weight: 900; fill: #000; }
      .h1 { font-size: 36px; font-weight: 900; fill: #000; }
      .sm { font-size: 18px; font-weight: 600; fill: #000; }
      .xs { font-size: 16px; font-weight: 600; fill: #666; }
      .muted { fill: #666; }
      .white { fill: #fff; }
    </style>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#000"/>
    </marker>
  </defs>

  <rect id="bg" width="2400" height="3200" fill="#fff"/>

  <g id="header">
    <rect x="0" y="0" width="2400" height="120" fill="#FFE600" stroke="#000" stroke-width="4"/>
    <text x="40" y="72" class="title">StoryLens 技术架构 · HCI 关系总览</text>
    <text x="40" y="104" class="sm muted">主 Skill × 分镜交集域 × TT 专家 · 腾讯初赛提交</text>
  </g>

  <g id="section-arch" transform="translate(0,150)">
    <text x="40" y="36" class="h1">一、三层架构</text>
    <g id="layer-main">
      <rect x="46" y="56" width="700" height="100" fill="#000"/>
      <rect x="40" y="50" width="700" height="100" fill="#fff" stroke="#000" stroke-width="3"/>
      <text x="390" y="95" text-anchor="middle" class="sm">storylens/SKILL.md</text>
      <text x="390" y="125" text-anchor="middle" class="xs">主 Skill 路由 · 工作流规范</text>
    </g>
    <g id="layer-intersection">
      <rect x="786" y="56" width="700" height="100" fill="#000"/>
      <rect x="780" y="50" width="700" height="100" fill="#FFE600" stroke="#000" stroke-width="3"/>
      <text x="1130" y="95" text-anchor="middle" class="sm">skills/storyboard-production/</text>
      <text x="1130" y="125" text-anchor="middle" class="xs">分镜交集域 · H×V 框定</text>
    </g>
    <g id="layer-experts">
      <rect x="1526" y="56" width="640" height="100" fill="#000"/>
      <rect x="1520" y="50" width="640" height="100" fill="#fff" stroke="#000" stroke-width="3"/>
      <text x="1840" y="95" text-anchor="middle" class="sm">专家skill/ × 4</text>
      <text x="1840" y="125" text-anchor="middle" class="xs">TT 专家纵深 · 可选增强</text>
    </g>
    <line x1="740" y1="100" x2="780" y2="100" stroke="#000" stroke-width="3" marker-end="url(#arrow)"/>
    <line x1="1480" y1="100" x2="1520" y2="100" stroke="#000" stroke-width="3" marker-end="url(#arrow)"/>
  </g>

  <g id="section-intersection" transform="translate(0,380)">
    <text x="40" y="36" class="h1">二、横向 × 纵向 交集域（大前提）</text>
    <rect x="40" y="55" width="2320" height="480" fill="#fafafa" stroke="#000" stroke-width="3"/>
    <text x="60" y="200" class="xs muted">纵</text>
    <text x="60" y="225" class="xs muted">向</text>
    <text x="60" y="250" class="xs muted">V</text>
    <line x1="120" y1="455" x2="2280" y2="455" stroke="#000" stroke-width="4"/>
    <text x="1150" y="490" text-anchor="middle" class="xs muted">横向 H · 主能力模式 →</text>
    <g transform="translate(120,80)"><rect x="6" y="6" width="280" height="70" fill="#000"/><rect width="280" height="70" fill="#fff" stroke="#000" stroke-width="2"/><text x="140" y="42" text-anchor="middle" class="sm">🌻 辛向阳</text><text x="10" y="90" class="xs muted">交互/行为/IDR</text></g>
    <g transform="translate(520,80)"><rect x="6" y="6" width="280" height="70" fill="#000"/><rect width="280" height="70" fill="#FFE600" stroke="#000" stroke-width="2"/><text x="140" y="42" text-anchor="middle" class="sm">👓 娄永琪</text><text x="10" y="90" class="xs muted">产品创新/Pitch</text></g>
    <g transform="translate(920,80)"><rect x="6" y="6" width="280" height="70" fill="#000"/><rect width="280" height="70" fill="#fff" stroke="#000" stroke-width="2"/><text x="140" y="42" text-anchor="middle" class="sm">🍐 李何槿</text><text x="10" y="90" class="xs muted">可持续/循环</text></g>
    <g transform="translate(1320,80)"><rect x="6" y="6" width="280" height="70" fill="#000"/><rect width="280" height="70" fill="#fff" stroke="#000" stroke-width="2"/><text x="140" y="42" text-anchor="middle" class="sm">6 柳喆俊</text><text x="10" y="90" class="xs muted">严肃游戏/VR</text></g>
    <g transform="translate(200,405)"><rect x="4" y="4" width="280" height="60" fill="#000"/><rect width="280" height="60" fill="#fff" stroke="#000" stroke-width="2"/><text x="140" y="38" text-anchor="middle" class="sm">🎮 游戏设计</text></g>
    <g transform="translate(700,405)"><rect x="4" y="4" width="280" height="60" fill="#000"/><rect width="280" height="60" fill="#fff" stroke="#000" stroke-width="2"/><text x="140" y="38" text-anchor="middle" class="sm">🎬 影视分镜</text></g>
    <g transform="translate(1200,405)"><rect x="4" y="4" width="280" height="60" fill="#000"/><rect width="280" height="60" fill="#FFE600" stroke="#000" stroke-width="2"/><text x="140" y="38" text-anchor="middle" class="sm">📐 产品概念</text></g>
    <g transform="translate(1700,405)"><rect x="4" y="4" width="280" height="60" fill="#000"/><rect width="280" height="60" fill="#fff" stroke="#000" stroke-width="2"/><text x="140" y="38" text-anchor="middle" class="sm">🎨 创作灵感</text></g>
    <g transform="translate(1200,275)"><polygon points="0,-80 200,0 0,80 -200,0" fill="#FF4081" stroke="#000" stroke-width="4"/><text y="-8" text-anchor="middle" class="sm">★ 分镜制作交集域 ★</text><text y="22" text-anchor="middle" class="sm">H ∩ V = 有效输出</text></g>
  </g>

  <g id="section-hci" transform="translate(0,920)">
    <text x="40" y="36" class="h1">三、HCI 人机交互设计（核心）</text>
    <g transform="translate(40,60)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#fff" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">渐进披露</text><text x="280" y="78" text-anchor="middle" class="xs muted">两轮引导提问 · 固定三维→LLM细化</text></g>
    <g transform="translate(630,60)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#FFE600" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">结构化选择</text><text x="280" y="78" text-anchor="middle" class="xs muted">A/B/C/D 卡片 · 降低认知负荷</text></g>
    <g transform="translate(1220,60)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#fff" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">操作门控</text><text x="280" y="78" text-anchor="middle" class="xs muted">LoRA 确认后才生图 · 防误触</text></g>
    <g transform="translate(1810,60)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#fff" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">可选增强</text><text x="280" y="78" text-anchor="middle" class="xs muted">TT 专家非强制 · 新手低门槛</text></g>
    <g transform="translate(40,190)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#fff" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">跨界面一致</text><text x="280" y="78" text-anchor="middle" class="xs muted">Agent ≡ HTML · 相同步骤</text></g>
    <g transform="translate(630,190)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#FFE600" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">即时反馈</text><text x="280" y="78" text-anchor="middle" class="xs muted">KG 三视图 · SVG+D3+树</text></g>
    <g transform="translate(1220,190)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#fff" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">错误容忍</text><text x="280" y="78" text-anchor="middle" class="xs muted">生图四重回退 · 降级不失败</text></g>
    <g transform="translate(1810,190)"><rect x="6" y="6" width="560" height="110" fill="#000"/><rect width="560" height="110" fill="#fff" stroke="#000" stroke-width="2"/><text x="280" y="48" text-anchor="middle" class="sm">用户控制</text><text x="280" y="78" text-anchor="middle" class="xs muted">历史v2·专家可取消 · 可撤销可改</text></g>
  </g>

  <g id="section-workflow" transform="translate(0,1270)">
    <text x="40" y="36" class="h1">四、5 阶段工作流（不可跳步）</text>
    <g transform="translate(40,60)"><rect x="6" y="6" width="430" height="90" fill="#000"/><rect width="430" height="90" fill="#fff" stroke="#000" stroke-width="2"/><text x="215" y="42" text-anchor="middle" class="sm">01 INPUT</text><text x="215" y="72" text-anchor="middle" class="xs muted">文字→Enter解析 · 两轮提问</text></g>
    <g transform="translate(510,60)"><rect x="6" y="6" width="430" height="90" fill="#000"/><rect width="430" height="90" fill="#FFE600" stroke="#000" stroke-width="2"/><text x="215" y="42" text-anchor="middle" class="sm">02 帧数</text><text x="215" y="72" text-anchor="middle" class="xs muted">1-24帧确认</text></g>
    <g transform="translate(980,60)"><rect x="6" y="6" width="430" height="90" fill="#000"/><rect width="430" height="90" fill="#fff" stroke="#000" stroke-width="2"/><text x="215" y="42" text-anchor="middle" class="sm">03 LoRA</text><text x="215" y="72" text-anchor="middle" class="xs muted">生图前门控</text></g>
    <g transform="translate(1450,60)"><rect x="6" y="6" width="430" height="90" fill="#000"/><rect width="430" height="90" fill="#fff" stroke="#000" stroke-width="2"/><text x="215" y="42" text-anchor="middle" class="sm">04 DRAFT</text><text x="215" y="72" text-anchor="middle" class="xs muted">分镜+KG</text></g>
    <g transform="translate(1920,60)"><rect x="6" y="6" width="430" height="90" fill="#000"/><rect width="430" height="90" fill="#FFE600" stroke="#000" stroke-width="2"/><text x="215" y="42" text-anchor="middle" class="sm">05 RENDER</text><text x="215" y="72" text-anchor="middle" class="xs muted">PNG/JSON导出</text></g>
    <line x1="470" y1="105" x2="510" y2="105" stroke="#000" stroke-width="3" marker-end="url(#arrow)"/>
    <line x1="940" y1="105" x2="980" y2="105" stroke="#000" stroke-width="3" marker-end="url(#arrow)"/>
    <line x1="1410" y1="105" x2="1450" y2="105" stroke="#000" stroke-width="3" marker-end="url(#arrow)"/>
    <line x1="1880" y1="105" x2="1920" y2="105" stroke="#000" stroke-width="3" marker-end="url(#arrow)"/>
  </g>

  <g id="section-combo" transform="translate(0,1490)">
    <text x="40" y="36" class="h1">五、典型协同：产品概念 + 娄永琪</text>
    <g transform="translate(40,60)"><rect x="6" y="6" width="1100" height="100" fill="#000"/><rect width="1100" height="100" fill="#fff" stroke="#000" stroke-width="2"/><text x="550" y="58" text-anchor="middle" class="sm">H · 产品概念模式：OPC / Pitch / CMF / 用户场景</text></g>
    <text x="1160" y="118" class="h1">+</text>
    <g transform="translate(1220,60)"><rect x="6" y="6" width="940" height="100" fill="#000"/><rect width="940" height="100" fill="#FFE600" stroke="#000" stroke-width="2"/><text x="470" y="58" text-anchor="middle" class="sm">V · 娄永琪：设计驱动创新 · 5段式方案评审</text></g>
    <g transform="translate(40,190)"><rect x="6" y="6" width="2120" height="80" fill="#000"/><rect width="2120" height="80" fill="#FF4081" stroke="#000" stroke-width="2"/><text x="1060" y="48" text-anchor="middle" class="sm">→ 输出：产品概念展示型分镜 + 每帧 KG（痛点→方案→价值 叙事链）</text></g>
  </g>

  <g id="footer">
    <rect x="0" y="3140" width="2400" height="60" fill="#000"/>
    <text x="40" y="3178" class="sm white">StoryLens · TT设计×腾讯初赛 · tech.html 完整版</text>
    <text x="1900" y="3178" class="sm" fill="#FFE600">tech-summary-brutalism.svg</text>
  </g>
</svg>'''


def figma_svg() -> str:
    return '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 3200" width="2400" height="3200" font-family="Inter, SF Pro Display, system-ui, sans-serif">
  <defs>
    <style>
      .title { font-size: 52px; font-weight: 700; fill: #1E1B4B; letter-spacing: -0.02em; }
      .h1 { font-size: 36px; font-weight: 700; fill: #1E1B4B; }
      .sm { font-size: 18px; font-weight: 600; fill: #312E81; }
      .xs { font-size: 16px; font-weight: 500; fill: #6366A0; }
      .muted { fill: #6366A0; }
      .white { fill: #fff; }
      .label { font-size: 11px; font-weight: 700; fill: #6366F1; letter-spacing: 0.08em; }
    </style>
    <linearGradient id="grad-header" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#EEF2FF"/><stop offset="100%" stop-color="#F5F3FF"/></linearGradient>
    <linearGradient id="grad-a" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#EEF2FF"/><stop offset="100%" stop-color="#E0E7FF"/></linearGradient>
    <linearGradient id="grad-b" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#F5F3FF"/><stop offset="100%" stop-color="#EDE9FE"/></linearGradient>
    <linearGradient id="grad-c" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FDF2F8"/><stop offset="100%" stop-color="#FCE7F3"/></linearGradient>
    <linearGradient id="grad-diamond" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#C084FC"/></linearGradient>
    <linearGradient id="grad-output" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#A855F7"/></linearGradient>
    <filter id="soft-shadow" x="-8%" y="-8%" width="116%" height="120%"><feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#6366F1" flood-opacity="0.12"/></filter>
    <filter id="card-shadow" x="-4%" y="-4%" width="108%" height="112%"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#312E81" flood-opacity="0.08"/></filter>
    <marker id="arrow-soft" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#A5B4FC"/></marker>
  </defs>

  <rect id="bg" width="2400" height="3200" fill="#FAFAFE"/>
  <g id="header" filter="url(#soft-shadow)">
    <rect x="40" y="24" width="2320" height="112" rx="20" fill="url(#grad-header)" stroke="#E0E7FF" stroke-width="1"/>
    <text x="72" y="72" class="label">STORYLENS ARCHITECTURE</text>
    <text x="72" y="112" class="title">技术架构 · HCI 关系总览</text>
    <text x="72" y="132" class="xs muted">主 Skill × 分镜交集域 × TT 专家 · 腾讯初赛提交</text>
  </g>

  <g id="section-arch" transform="translate(0,170)">
    <text x="40" y="36" class="h1">一、三层架构</text>
    <g transform="translate(40,60)" filter="url(#card-shadow)"><rect width="700" height="100" rx="16" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="350" y="48" text-anchor="middle" class="sm">storylens/SKILL.md</text><text x="350" y="78" text-anchor="middle" class="xs">主 Skill 路由 · 工作流规范</text></g>
    <g transform="translate(780,60)" filter="url(#card-shadow)"><rect width="700" height="100" rx="16" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="350" y="48" text-anchor="middle" class="sm">skills/storyboard-production/</text><text x="350" y="78" text-anchor="middle" class="xs">分镜交集域 · H×V 框定</text></g>
    <g transform="translate(1520,60)" filter="url(#card-shadow)"><rect width="640" height="100" rx="16" fill="url(#grad-c)" stroke="#FBCFE8" stroke-width="1"/><text x="320" y="48" text-anchor="middle" class="sm">专家skill/ × 4</text><text x="320" y="78" text-anchor="middle" class="xs">TT 专家纵深 · 可选增强</text></g>
    <line x1="740" y1="110" x2="780" y2="110" stroke="#A5B4FC" stroke-width="2" marker-end="url(#arrow-soft)"/>
    <line x1="1480" y1="110" x2="1520" y2="110" stroke="#A5B4FC" stroke-width="2" marker-end="url(#arrow-soft)"/>
  </g>

  <g id="section-intersection" transform="translate(0,400)">
    <text x="40" y="36" class="h1">二、横向 × 纵向 交集域（大前提）</text>
    <rect x="40" y="55" width="2320" height="480" rx="24" fill="#fff" stroke="#E0E7FF" stroke-width="1" filter="url(#card-shadow)"/>
    <text x="72" y="200" class="xs muted">纵</text><text x="72" y="225" class="xs muted">向</text><text x="72" y="250" class="xs muted">V</text>
    <line x1="120" y1="455" x2="2280" y2="455" stroke="#C7D2FE" stroke-width="3"/>
    <text x="1150" y="490" text-anchor="middle" class="xs muted">横向 H · 主能力模式 →</text>
    <g transform="translate(120,90)"><rect width="280" height="64" rx="12" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="140" y="40" text-anchor="middle" class="sm">🌻 辛向阳</text><text x="12" y="88" class="xs muted">交互/行为/IDR</text></g>
    <g transform="translate(520,90)"><rect width="280" height="64" rx="12" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="140" y="40" text-anchor="middle" class="sm">👓 娄永琪</text><text x="12" y="88" class="xs muted">产品创新/Pitch</text></g>
    <g transform="translate(920,90)"><rect width="280" height="64" rx="12" fill="url(#grad-c)" stroke="#FBCFE8" stroke-width="1"/><text x="140" y="40" text-anchor="middle" class="sm">🍐 李何槿</text><text x="12" y="88" class="xs muted">可持续/循环</text></g>
    <g transform="translate(1320,90)"><rect width="280" height="64" rx="12" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="140" y="40" text-anchor="middle" class="sm">6 柳喆俊</text><text x="12" y="88" class="xs muted">严肃游戏/VR</text></g>
    <g transform="translate(200,400)"><rect width="280" height="56" rx="12" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/><text x="140" y="36" text-anchor="middle" class="sm">🎮 游戏设计</text></g>
    <g transform="translate(700,400)"><rect width="280" height="56" rx="12" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="140" y="36" text-anchor="middle" class="sm">🎬 影视分镜</text></g>
    <g transform="translate(1200,400)"><rect width="280" height="56" rx="12" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="140" y="36" text-anchor="middle" class="sm">📐 产品概念</text></g>
    <g transform="translate(1700,400)"><rect width="280" height="56" rx="12" fill="url(#grad-c)" stroke="#FBCFE8" stroke-width="1"/><text x="140" y="36" text-anchor="middle" class="sm">🎨 创作灵感</text></g>
    <g transform="translate(1200,280)"><polygon points="0,-72 180,0 0,72 -180,0" fill="url(#grad-diamond)"/><text y="-6" text-anchor="middle" class="sm white">★ 分镜制作交集域 ★</text><text y="22" text-anchor="middle" class="sm white">H ∩ V = 有效输出</text></g>
  </g>

  <g id="section-hci" transform="translate(0,940)">
    <text x="40" y="36" class="h1">三、HCI 人机交互设计（核心）</text>
    <g transform="translate(40,60)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">渐进披露</text><text x="280" y="78" text-anchor="middle" class="xs">两轮引导提问 · 固定三维→LLM细化</text></g>
    <g transform="translate(630,60)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">结构化选择</text><text x="280" y="78" text-anchor="middle" class="xs">A/B/C/D 卡片 · 降低认知负荷</text></g>
    <g transform="translate(1220,60)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="url(#grad-c)" stroke="#FBCFE8" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">操作门控</text><text x="280" y="78" text-anchor="middle" class="xs">LoRA 确认后才生图 · 防误触</text></g>
    <g transform="translate(1810,60)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">可选增强</text><text x="280" y="78" text-anchor="middle" class="xs">TT 专家非强制 · 新手低门槛</text></g>
    <g transform="translate(40,190)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">跨界面一致</text><text x="280" y="78" text-anchor="middle" class="xs">Agent ≡ HTML · 相同步骤</text></g>
    <g transform="translate(630,190)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">即时反馈</text><text x="280" y="78" text-anchor="middle" class="xs">KG 三视图 · SVG+D3+树</text></g>
    <g transform="translate(1220,190)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">错误容忍</text><text x="280" y="78" text-anchor="middle" class="xs">生图四重回退 · 降级不失败</text></g>
    <g transform="translate(1810,190)" filter="url(#card-shadow)"><rect width="560" height="110" rx="14" fill="url(#grad-c)" stroke="#FBCFE8" stroke-width="1"/><text x="280" y="48" text-anchor="middle" class="sm">用户控制</text><text x="280" y="78" text-anchor="middle" class="xs">历史v2·专家可取消 · 可撤销可改</text></g>
  </g>

  <g id="section-workflow" transform="translate(0,1290)">
    <text x="40" y="36" class="h1">四、5 阶段工作流（不可跳步）</text>
    <g transform="translate(40,60)" filter="url(#card-shadow)"><rect width="430" height="90" rx="14" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="215" y="42" text-anchor="middle" class="sm">01 INPUT</text><text x="215" y="72" text-anchor="middle" class="xs">文字→Enter解析 · 两轮提问</text></g>
    <g transform="translate(510,60)" filter="url(#card-shadow)"><rect width="430" height="90" rx="14" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="215" y="42" text-anchor="middle" class="sm">02 帧数</text><text x="215" y="72" text-anchor="middle" class="xs">1-24帧确认</text></g>
    <g transform="translate(980,60)" filter="url(#card-shadow)"><rect width="430" height="90" rx="14" fill="url(#grad-c)" stroke="#FBCFE8" stroke-width="1"/><text x="215" y="42" text-anchor="middle" class="sm">03 LoRA</text><text x="215" y="72" text-anchor="middle" class="xs">生图前门控</text></g>
    <g transform="translate(1450,60)" filter="url(#card-shadow)"><rect width="430" height="90" rx="14" fill="url(#grad-a)" stroke="#C7D2FE" stroke-width="1"/><text x="215" y="42" text-anchor="middle" class="sm">04 DRAFT</text><text x="215" y="72" text-anchor="middle" class="xs">分镜+KG</text></g>
    <g transform="translate(1920,60)" filter="url(#card-shadow)"><rect width="430" height="90" rx="14" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="215" y="42" text-anchor="middle" class="sm">05 RENDER</text><text x="215" y="72" text-anchor="middle" class="xs">PNG/JSON导出</text></g>
    <line x1="470" y1="105" x2="510" y2="105" stroke="#A5B4FC" stroke-width="2" marker-end="url(#arrow-soft)"/>
    <line x1="940" y1="105" x2="980" y2="105" stroke="#A5B4FC" stroke-width="2" marker-end="url(#arrow-soft)"/>
    <line x1="1410" y1="105" x2="1450" y2="105" stroke="#A5B4FC" stroke-width="2" marker-end="url(#arrow-soft)"/>
    <line x1="1880" y1="105" x2="1920" y2="105" stroke="#A5B4FC" stroke-width="2" marker-end="url(#arrow-soft)"/>
  </g>

  <g id="section-combo" transform="translate(0,1510)">
    <text x="40" y="36" class="h1">五、典型协同：产品概念 + 娄永琪</text>
    <g transform="translate(40,60)" filter="url(#card-shadow)"><rect width="1100" height="100" rx="16" fill="url(#grad-b)" stroke="#DDD6FE" stroke-width="1"/><text x="550" y="58" text-anchor="middle" class="sm">H · 产品概念模式：OPC / Pitch / CMF / 用户场景</text></g>
    <text x="1160" y="118" class="h1" fill="#A5B4FC">+</text>
    <g transform="translate(1220,60)" filter="url(#card-shadow)"><rect width="940" height="100" rx="16" fill="url(#grad-c)" stroke="#FBCFE8" stroke-width="1"/><text x="470" y="58" text-anchor="middle" class="sm">V · 娄永琪：设计驱动创新 · 5段式方案评审</text></g>
    <g transform="translate(40,190)" filter="url(#soft-shadow)"><rect width="2120" height="80" rx="16" fill="url(#grad-output)"/><text x="1060" y="48" text-anchor="middle" class="sm white">→ 输出：产品概念展示型分镜 + 每帧 KG（痛点→方案→价值 叙事链）</text></g>
  </g>

  <g id="footer">
    <rect x="40" y="3140" width="2320" height="52" rx="14" fill="#1E1B4B"/>
    <text x="72" y="3174" class="xs white">StoryLens · TT设计×腾讯初赛 · tech.html 完整版</text>
    <text x="2100" y="3174" text-anchor="end" class="xs" fill="#A5B4FC">tech-summary-figma.svg</text>
  </g>
</svg>'''


def main():
    out_brutal = ROOT / "tech-summary-brutalism.svg"
    out_figma = ROOT / "tech-summary-figma.svg"
    out_brutal.write_text(brutalism_svg(), encoding="utf-8")
    out_figma.write_text(figma_svg(), encoding="utf-8")
    print(f"Saved: {out_brutal}")
    print(f"Saved: {out_figma}")


if __name__ == "__main__":
    main()
