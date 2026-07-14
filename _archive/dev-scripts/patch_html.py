#!/usr/bin/env python3
"""Patch storylens-generator.html: Jimeng API + TT Expert widget."""

import re
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "assets" / "storylens-generator.html"

CSS_INSERT = """
/* ── TT EXPERT PICKER ── */
.expert-section{padding:10px 14px;border-top:2px solid var(--fg);background:var(--bg);}
.expert-section-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.expert-section-title span{font-size:9px;padding:1px 6px;border:2px solid var(--fg);background:var(--purple);color:#fff;}
.expert-avatars{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.expert-avatar{width:48px;height:48px;border-radius:50%;border:2px solid var(--fg);box-shadow:2px 2px 0 var(--fg);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;background:var(--bg);transition:all .12s;position:relative;}
.expert-avatar:hover{box-shadow:1px 1px 0 var(--fg);transform:translate(1px,1px);}
.expert-avatar.selected{box-shadow:0 0 0 3px var(--cyan),2px 2px 0 var(--fg);transform:scale(1.08);}
.expert-avatar .expert-name{position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:900;white-space:nowrap;color:var(--fg);}
.expert-info{font-size:10px;font-weight:700;color:#555;text-align:center;margin-top:18px;min-height:14px;}
.msg.expert{align-self:flex-start;background:var(--purple);color:#fff;box-shadow:2px 2px 0 var(--fg);}
.msg-expert-tag{display:inline-block;font-size:9px;font-weight:900;padding:1px 6px;border:1px solid rgba(255,255,255,.5);margin-bottom:4px;background:rgba(0,0,0,.2);}
"""

AI_WIDGET_OLD = """<div class="ai-widget">
  <button class="ai-fab" id="aiFab" onclick="toggleAIPanel()">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2m-9-11H1m22 0h-2m-1.3-7.7L18 6m-12 0-1.7-1.7M6 18l-1.7 1.7M18 18l1.7 1.7"/></svg>
  </button>
  <div class="ai-panel" id="aiPanel">
    <div class="ai-header">
      <div class="ai-avatar" style="background:var(--cyan);color:#fff;">游</div>
      <div>
        <div class="ai-title">StoryLens</div>
        <div class="ai-status" id="aiStatus">在线 · 分镜创意助手</div>
      </div>
      <button class="ai-close" onclick="toggleAIPanel()">×</button>
    </div>
    <div class="ai-messages" id="aiMessages">
      <div class="msg ai">你好！我是「StoryLens」分镜创意助手。基于当前分镜的真实数据回答问题。</div>
    </div>
    <div class="chips" id="suggestionChips">
      <div class="chip" onclick="askQuestion('分析当前所有分镜的维度占比')">维度占比</div>
      <div class="chip" onclick="askQuestion('当前分镜的镜头序列分析')">镜头序列</div>
      <div class="chip" onclick="askQuestion('分镜叙事节奏和情感弧线')">节奏分析</div>
      <div class="chip" onclick="askQuestion('生成优化的 prompt 建议')">Prompt 优化</div>
    </div>
    <div class="ai-input-row">
      <input type="text" class="ai-input" id="aiInput" placeholder="输入问题..." onkeydown="if(event.key==='Enter')sendMessage()">
      <button class="ai-send" onclick="sendMessage()">发送</button>
    </div>
  </div>
</div>"""

AI_WIDGET_NEW = """<div class="ai-widget">
  <button class="ai-fab" id="aiFab" onclick="toggleAIPanel()">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2m-9-11H1m22 0h-2m-1.3-7.7L18 6m-12 0-1.7-1.7M6 18l-1.7 1.7M18 18l1.7 1.7"/></svg>
  </button>
  <div class="ai-panel" id="aiPanel">
    <div class="ai-header">
      <div class="ai-avatar" id="aiHeaderAvatar" style="background:var(--cyan);color:#fff;">游</div>
      <div>
        <div class="ai-title" id="aiTitle">StoryLens</div>
        <div class="ai-status" id="aiStatus">在线 · 分镜创意助手</div>
      </div>
      <button class="ai-close" onclick="toggleAIPanel()">×</button>
    </div>
    <div class="expert-section">
      <div class="expert-section-title">TT 专家协同 <span>企业自建</span></div>
      <div class="expert-avatars" id="expertAvatars"></div>
      <div class="expert-info" id="expertInfo">点击选择一位专家协同提问（可选）</div>
    </div>
    <div class="ai-messages" id="aiMessages">
      <div class="msg ai">你好！我是「StoryLens」分镜创意助手。可选择上方 TT 专家协同，获取专业视角建议。</div>
    </div>
    <div class="chips" id="suggestionChips">
      <div class="chip" onclick="askQuestion('分析当前所有分镜的维度占比')">维度占比</div>
      <div class="chip" onclick="askQuestion('当前分镜的镜头序列分析')">镜头序列</div>
      <div class="chip" onclick="askQuestion('分镜叙事节奏和情感弧线')">节奏分析</div>
      <div class="chip" onclick="askQuestion('生成优化的 prompt 建议')">Prompt 优化</div>
    </div>
    <div class="ai-input-row">
      <input type="text" class="ai-input" id="aiInput" placeholder="输入问题..." onkeydown="if(event.key==='Enter')sendMessage()">
      <button class="ai-send" onclick="sendMessage()">发送</button>
    </div>
  </div>
</div>"""

JIMENG_CONFIG = """
    <!-- Jimeng (即梦) Config -->
    <div class="lora-config" style="margin-bottom:16px;border-color:var(--orange);">
      <div class="lora-config-title" style="color:var(--orange);">🎨 即梦 AI 生图引擎 (推荐)</div>
      <div style="font-size:9px;color:#888;padding:4px 0 8px;">火山引擎即梦文生图 4.0 · 需启动 jimeng_proxy_server.py</div>
      <div class="lora-config-row">
        <label>代理地址</label>
        <input type="text" id="jimengUrl" value="http://127.0.0.1:18901" placeholder="http://127.0.0.1:18901">
        <button class="b-btn" style="padding:4px 10px;font-size:9px;" onclick="testJimeng()">测试</button>
      </div>
      <div class="lora-config-row">
        <label>Access Key</label>
        <input type="password" id="jimengAccessKey" placeholder="即梦 Access Key ID" style="width:100%;font-size:9px;padding:4px 6px;border:2px solid var(--fg);background:var(--bg);font-family:var(--mono);box-sizing:border-box;">
      </div>
      <div class="lora-config-row">
        <label>Secret Key</label>
        <input type="password" id="jimengSecretKey" placeholder="即梦 Secret Access Key" style="width:100%;font-size:9px;padding:4px 6px;border:2px solid var(--fg);background:var(--bg);font-family:var(--mono);box-sizing:border-box;">
      </div>
      <div id="jimengStatus" style="font-size:10px;font-weight:700;color:#888;padding-top:6px;">未检测</div>
    </div>
"""

APPSTATE_OLD = "  buddyCloud:{url:'http://127.0.0.1:18900', connected:false, token:''}\n};"

APPSTATE_NEW = """  buddyCloud:{url:'http://127.0.0.1:18900', connected:false, token:''},
  jimeng:{url:'http://127.0.0.1:18901', connected:false, accessKey:'', secretKey:''},
  activeExpert:null
};"""

EXPERT_JS = """
// ══════════════════════════════════════════════
//  TT EXPERT COLLABORATION
// ══════════════════════════════════════════════
const TT_EXPERTS = [
  {
    id:'xinxiangyang', name:'辛向阳', icon:'🌻', color:'var(--yellow)',
    title:'交互设计 · 行为逻辑 · IDR方法',
    chips:['行为逻辑分析','体验设计框架','服务设计A-C/E-M','交互五要素拆解'],
    prefix:'【辛向阳 AI 视角】',
    style:'设计的对象不是物理器物，而是行为本身。从交互五要素（人/目的/场景/媒介/行为）来看：'
  },
  {
    id:'louyongqi', name:'娄永琪', icon:'👓', color:'var(--blue)',
    title:'设计驱动创新 · 社会创新 · 设计教育',
    chips:['社会创新评点','设计教育路径','针灸式设计','方案5段式评审'],
    prefix:'【娄永琪 AI 视角】',
    style:'设计的本质是人类一切有意识创造活动的先导和准备。从设计驱动创新的角度：'
  },
  {
    id:'lihejin', name:'李何槿', icon:'🍐', color:'var(--green)',
    title:'设计驱动创业 · 循环经济 · 用户体验',
    chips:['可持续设计评估','循环经济视角','UX策略分析','设计思维工作坊'],
    prefix:'【李何槿 AI 视角】',
    style:'循环不是贴在报告封面上的口号，它可以从一个社区、一件旧物开始。从可持续设计看：'
  },
  {
    id:'liuzhejun', name:'柳喆俊', icon:'6', color:'var(--orange)',
    title:'严肃游戏 · 游戏化教学 · VR教育',
    chips:['严肃游戏设计','游戏核心循环','PBL项目制','技理道三层分析'],
    prefix:'【柳喆俊 AI 视角】',
    style:'游戏是综合性媒介——它能同时承载叙事、交互、视觉和系统思维。从游戏设计教育看：'
  }
];

function renderExpertAvatars() {
  var container = document.getElementById('expertAvatars');
  if (!container) return;
  container.innerHTML = TT_EXPERTS.map(function(e) {
    var sel = appState.activeExpert === e.id ? ' selected' : '';
    return '<div class="expert-avatar' + sel + '" id="expert-' + e.id + '" onclick="selectExpert(\\'' + e.id + '\\')" title="' + e.name + ' · ' + e.title + '" style="background:' + e.color + ';">' +
      e.icon + '<span class="expert-name">' + e.name + '</span></div>';
  }).join('');
}

function selectExpert(id) {
  if (appState.activeExpert === id) {
    appState.activeExpert = null;
    document.getElementById('aiTitle').textContent = 'StoryLens';
    document.getElementById('aiHeaderAvatar').textContent = '游';
    document.getElementById('aiHeaderAvatar').style.background = 'var(--cyan)';
    document.getElementById('aiStatus').textContent = '在线 · 分镜创意助手';
    document.getElementById('expertInfo').textContent = '点击选择一位专家协同提问（可选）';
    updateExpertChips(null);
  } else {
    appState.activeExpert = id;
    var expert = TT_EXPERTS.find(function(e) { return e.id === id; });
    if (expert) {
      document.getElementById('aiTitle').textContent = 'StoryLens + ' + expert.name;
      document.getElementById('aiHeaderAvatar').textContent = expert.icon;
      document.getElementById('aiHeaderAvatar').style.background = expert.color;
      document.getElementById('aiStatus').textContent = expert.title;
      document.getElementById('expertInfo').textContent = '已选择 ' + expert.name + ' · 再次点击取消';
      updateExpertChips(expert);
      addMessage('ai', expert.prefix + '\\n已接入「' + expert.name + '」专家视角。你可以问我关于分镜、设计或游戏化的问题。');
    }
  }
  renderExpertAvatars();
}

function updateExpertChips(expert) {
  var chips = document.getElementById('suggestionChips');
  if (!chips) return;
  if (!expert) {
    chips.innerHTML = '<div class="chip" onclick="askQuestion(\\'分析当前所有分镜的维度占比\\')">维度占比</div>' +
      '<div class="chip" onclick="askQuestion(\\'当前分镜的镜头序列分析\\')">镜头序列</div>' +
      '<div class="chip" onclick="askQuestion(\\'分镜叙事节奏和情感弧线\\')">节奏分析</div>' +
      '<div class="chip" onclick="askQuestion(\\'生成优化的 prompt 建议\\')">Prompt 优化</div>';
    return;
  }
  chips.innerHTML = expert.chips.map(function(c) {
    return '<div class="chip" onclick="askQuestion(\\'' + c + '\\')">' + c + '</div>';
  }).join('');
}

function getActiveExpert() {
  if (!appState.activeExpert) return null;
  return TT_EXPERTS.find(function(e) { return e.id === appState.activeExpert; });
}
"""

JIMENG_JS = """
// ══════════════════════════════════════════════
//  JIMENG (即梦) IMAGE GENERATION
// ══════════════════════════════════════════════
function testJimeng() {
  var url = document.getElementById('jimengUrl').value.replace(/\\/+$/, '');
  var statusEl = document.getElementById('jimengStatus');
  var akInput = document.getElementById('jimengAccessKey');
  var skInput = document.getElementById('jimengSecretKey');
  statusEl.textContent = '正在连接...';
  statusEl.style.color = 'var(--orange)';

  fetch(url + '/health', { method: 'GET', signal: AbortSignal.timeout(5000) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status === 'ok') {
        var ak = (akInput && akInput.value.trim()) || '';
        var sk = (skInput && skInput.value.trim()) || '';
        appState.jimeng.url = url;
        appState.jimeng.connected = true;
        if (ak) appState.jimeng.accessKey = ak;
        if (sk) appState.jimeng.secretKey = sk;
        var ready = ak && sk || data.credentials;
        statusEl.textContent = ready ? '🎨 即梦已连接 · 就绪' : '⚠ 代理在线 · 需配置密钥';
        statusEl.style.color = ready ? 'var(--green)' : 'var(--orange)';
        refreshDraft();
      } else {
        throw new Error('Unexpected response');
      }
    })
    .catch(function(e) {
      appState.jimeng.connected = false;
      statusEl.textContent = '❌ 连接失败: ' + e.message;
      statusEl.style.color = 'var(--red)';
    });
}

function generateViaJimeng(frame, style, loraModel) {
  var url = document.getElementById('jimengUrl').value.replace(/\\/+$/, '');
  var prompt = buildBuddyCloudPrompt(frame, style, loraModel);
  var sizeMap = { sketch: [768,480], render: [1024,640], anime: [768,768], street: [768,768] };
  var size = sizeMap[style.type] || [1024,640];

  var payload = { prompt: prompt, width: size[0], height: size[1] };
  if (appState.jimeng.accessKey) payload.access_key = appState.jimeng.accessKey;
  if (appState.jimeng.secretKey) payload.secret_key = appState.jimeng.secretKey;

  return fetch(url + '/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(r) {
    if (!r.ok) {
      return r.json().then(function(err) { throw new Error(err.error || 'HTTP ' + r.status); });
    }
    return r.json();
  })
  .then(function(data) {
    if (data.status === 'success' && data.data_url) return data.data_url;
    throw new Error(data.error || 'No image returned');
  });
}
"""

def patch():
    content = HTML.read_text(encoding="utf-8")
    original_len = len(content)

    # 1. CSS
    if ".expert-avatar" not in content:
        content = content.replace(
            "/* ── D3 GRAPH in overlay ── */",
            CSS_INSERT + "\n/* ── D3 GRAPH in overlay ── */",
        )
        print("✓ CSS inserted")

    # 2. AI Widget
    if AI_WIDGET_OLD in content:
        content = content.replace(AI_WIDGET_OLD, AI_WIDGET_NEW)
        print("✓ AI widget replaced")
    elif "expert-avatars" in content:
        print("· AI widget already patched")
    else:
        print("✗ AI widget not found")

    # 3. Jimeng config (before Buddy Cloud)
    if 'id="jimengUrl"' not in content:
        content = content.replace(
            "    <!-- Buddy Cloud Config -->",
            JIMENG_CONFIG + "\n    <!-- Buddy Cloud Config -->",
        )
        print("✓ Jimeng config inserted")

    # 4. appState
    if "jimeng:" not in content:
        content = content.replace(APPSTATE_OLD, APPSTATE_NEW)
        print("✓ appState updated")

    # 5. Expert JS (before AI ENGINE section)
    if "TT_EXPERTS" not in content:
        content = content.replace(
            "// ══════════════════════════════════════════════\n//  StoryLens AI ENGINE (real data)",
            EXPERT_JS + "\n// ══════════════════════════════════════════════\n//  StoryLens AI ENGINE (real data)",
        )
        print("✓ Expert JS inserted")

    # 6. Jimeng JS (before BUDDY CLOUD section)
    if "generateViaJimeng" not in content:
        content = content.replace(
            "// ══════════════════════════════════════════════\n//  BUDDY CLOUD IMAGE GENERATION",
            JIMENG_JS + "\n// ══════════════════════════════════════════════\n//  BUDDY CLOUD IMAGE GENERATION",
        )
        print("✓ Jimeng JS inserted")

    # 7. Update generateFrameImage priority
    if "appState.jimeng.connected" not in content:
        content = content.replace(
            "  if (appState.buddyCloud.connected) {\n    // Priority: Buddy Cloud (WorkBuddy built-in)",
            "  if (appState.jimeng.connected) {\n    if (progress) progress.style.width = '10%';\n    generateViaJimeng(frame, appState.style, loraModel)\n      .then(function(dataUrl) {\n        appState.generatedImages[frameId] = dataUrl;\n        if (progress) progress.style.width = '100%';\n        renderRenderPage();\n        if (btn) btn.classList.remove('generating');\n      })\n      .catch(function(e) {\n        console.warn('Jimeng failed, trying Buddy Cloud:', e);\n        tryNextEngine();\n      });\n    function tryNextEngine() {\n      if (appState.buddyCloud.connected) {\n        generateViaBuddyCloud(frame, appState.style, loraModel)\n          .then(function(dataUrl) {\n            appState.generatedImages[frameId] = dataUrl;\n            if (progress) progress.style.width = '100%';\n            renderRenderPage();\n            if (btn) btn.classList.remove('generating');\n          })\n          .catch(function(e2) {\n            console.warn('Buddy Cloud failed, trying SD:', e2);\n            if (appState.sdApi.connected) {\n              generateViaSdApi(frame, appState.style, loraModel)\n                .then(function(dataUrl) {\n                  appState.generatedImages[frameId] = dataUrl;\n                  if (progress) progress.style.width = '100%';\n                  renderRenderPage();\n                  if (btn) btn.classList.remove('generating');\n                })\n                .catch(function() { fallbackCanvasMock(frameId, frame, btn, progress); });\n            } else { fallbackCanvasMock(frameId, frame, btn, progress); }\n          });\n      } else if (appState.sdApi.connected) {\n        generateViaSdApi(frame, appState.style, loraModel)\n          .then(function(dataUrl) {\n            appState.generatedImages[frameId] = dataUrl;\n            if (progress) progress.style.width = '100%';\n            renderRenderPage();\n            if (btn) btn.classList.remove('generating');\n          })\n          .catch(function() { fallbackCanvasMock(frameId, frame, btn, progress); });\n      } else { fallbackCanvasMock(frameId, frame, btn, progress); }\n    }\n  } else if (appState.buddyCloud.connected) {\n    // Priority: Buddy Cloud (WorkBuddy built-in)",
        )
        print("✓ generateFrameImage priority updated")

    # 8. batchGenerateAll priority
    content = re.sub(
        r"var engineLabel = appState\.buddyCloud\.connected \? '☁ Cloud' : \(appState\.sdApi\.connected \? '🔗 SD' : '🔧 Mock'\);",
        "var engineLabel = appState.jimeng.connected ? '🎨 即梦' : (appState.buddyCloud.connected ? '☁ Cloud' : (appState.sdApi.connected ? '🔗 SD' : '🔧 Mock'));",
        content,
    )

    if "if (appState.buddyCloud.connected) {\n        return generateViaBuddyCloud" in content and "appState.jimeng.connected" not in content.split("function doGenerate")[1][:500] if "function doGenerate" in content else True:
        content = content.replace(
            "    function doGenerate(frame, loraModel) {\n      if (appState.buddyCloud.connected) {",
            "    function doGenerate(frame, loraModel) {\n      if (appState.jimeng.connected) {\n        return generateViaJimeng(frame, appState.style, loraModel)\n          .catch(function(e) {\n            console.warn('Jimeng failed, trying Buddy Cloud:', e);\n            if (appState.buddyCloud.connected) return generateViaBuddyCloud(frame, appState.style, loraModel);\n            if (appState.sdApi.connected) return generateViaSdApi(frame, appState.style, loraModel);\n            return Promise.reject('no-engine');\n          });\n      } else if (appState.buddyCloud.connected) {",
        )
        print("✓ batchGenerateAll priority updated")

    content = content.replace(
        "    if (appState.buddyCloud.connected || appState.sdApi.connected) {",
        "    if (appState.jimeng.connected || appState.buddyCloud.connected || appState.sdApi.connected) {",
    )

    # 9. refreshDraftTags engine label
    content = content.replace(
        "    if (appState.buddyCloud.connected) {\n      tag.className = 'b-tag tag-green';\n      tag.textContent = '☁ Buddy Cloud';",
        "    if (appState.jimeng.connected) {\n      tag.className = 'b-tag tag-green';\n      tag.textContent = '🎨 即梦 AI';\n    } else if (appState.buddyCloud.connected) {\n      tag.className = 'b-tag tag-green';\n      tag.textContent = '☁ Buddy Cloud';",
    )

    # 10. generateResponse expert mode
    if "getActiveExpert()" not in content.split("function generateResponse")[1][:200] if "function generateResponse" in content else "":
        content = content.replace(
            "function generateResponse(q) {\n  var dims = analyzeDimensions()",
            "function generateResponse(q) {\n  var expert = getActiveExpert();\n  var dims = analyzeDimensions()",
        )
        content = content.replace(
            "  addMessage('ai', response);",
            "  if (expert) {\n    response = expert.prefix + '\\n\\n' + expert.style + '\\n\\n' + response;\n    var ms = document.getElementById('aiMessages');\n    var m = document.createElement('div'); m.className = 'msg expert';\n    m.innerHTML = '<div class=\"msg-expert-tag\">' + expert.name + ' · TT专家</div>' + response;\n    ms.appendChild(m); ms.scrollTop = ms.scrollHeight;\n  } else {\n    addMessage('ai', response);\n  }",
        )
        print("✓ generateResponse expert mode updated")

    # 11. Init: render experts + auto-detect jimeng
    init_block = """loadPersistedHistory();
renderDraftBoard();
refreshDraftTags();"""

    init_new = """loadPersistedHistory();
renderExpertAvatars();
renderDraftBoard();
refreshDraftTags();"""

    if "renderExpertAvatars()" not in content:
        content = content.replace(init_block, init_new)

    if "jimengUrl" not in content.split("// Auto-detect Buddy Cloud proxy on load")[1][:800] if "// Auto-detect Buddy Cloud proxy on load" in content else "":
        jimeng_init = """
// Auto-detect Jimeng proxy on load
(function() {
  var url = document.getElementById('jimengUrl');
  if (!url) return;
  var statusEl = document.getElementById('jimengStatus');
  var akInput = document.getElementById('jimengAccessKey');
  var skInput = document.getElementById('jimengSecretKey');
  fetch(url.value.replace(/\\/+$/, '') + '/health', { method: 'GET', signal: AbortSignal.timeout(3000) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status === 'ok') {
        appState.jimeng.connected = true;
        appState.jimeng.url = url.value.replace(/\\/+$/, '');
        var ak = (akInput && akInput.value.trim()) || '';
        var sk = (skInput && skInput.value.trim()) || '';
        if (ak) appState.jimeng.accessKey = ak;
        if (sk) appState.jimeng.secretKey = sk;
        if (statusEl) {
          statusEl.textContent = (ak && sk || data.credentials) ? '🎨 即梦在线 · 就绪' : '⚠ 代理在线 · 需密钥';
          statusEl.style.color = (ak && sk || data.credentials) ? 'var(--green)' : 'var(--orange)';
        }
        var tag = document.getElementById('sdApiTag');
        if (tag) { tag.style.display = 'inline-flex'; tag.className = (ak && sk || data.credentials) ? 'b-tag tag-green' : 'b-tag tag-orange'; tag.textContent = '🎨 即梦 AI'; }
      }
    })
    .catch(function() {});
})();
"""
        content = content.replace(
            "// Auto-detect Buddy Cloud proxy on load",
            jimeng_init + "\n// Auto-detect Buddy Cloud proxy on load",
        )
        print("✓ Jimeng auto-detect init added")

    HTML.write_text(content, encoding="utf-8")
    print(f"\nDone. {original_len} → {len(content)} bytes")


if __name__ == "__main__":
    patch()
