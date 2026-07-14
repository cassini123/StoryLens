#!/usr/bin/env python3
"""Patch storylens-generator.html: history (real save, 10 items), KG pie chart + stagger layout."""

from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "assets" / "storylens-generator.html"

CSS_OLD = """.kg-svg-container{width:100%;min-height:340px;border:2px solid var(--fg);background:var(--gray);position:relative;overflow:hidden;}
.kg-svg-container svg{width:100%;height:100%;}"""

CSS_NEW = """.kg-svg-container{width:100%;min-height:340px;border:2px solid var(--fg);background:var(--gray);position:relative;overflow:hidden;transition:transform .28s cubic-bezier(.4,0,.2,1),box-shadow .28s;transform-origin:center center;}
.kg-svg-container:hover{transform:scale(1.06);overflow:visible;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:5;}
.kg-svg-container svg{width:100%;height:100%;display:block;}
.kg-pie-slice{transition:opacity .2s;}
.kg-pie-slice:hover{opacity:.92;}
.kg-svg-label-preview{pointer-events:none;}
.kg-svg-label-full{opacity:0;pointer-events:none;transition:opacity .15s;}
.kg-svg-container:hover .kg-svg-label-preview{opacity:0;}
.kg-svg-container:hover .kg-svg-label-full{opacity:1;}"""

SKILL_FLOAT_OLD = """.skill-float{position:fixed;bottom:74px;right:88px;z-index:399;display:flex;flex-direction:column;align-items:center;gap:6px;}
.skill-float-label{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--fg);background:var(--bg);border:2px solid var(--fg);padding:1px 6px;box-shadow:2px 2px 0 var(--fg);}
.skill-float-btns{display:flex;flex-direction:column;gap:8px;}"""

SKILL_FLOAT_NEW = """.skill-float{position:fixed;bottom:108px;right:20px;z-index:380;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none;}
.skill-float-label{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--fg);background:var(--bg);border:2px solid var(--fg);padding:1px 6px;box-shadow:2px 2px 0 var(--fg);pointer-events:auto;margin-right:4px;}
.skill-float-btns{display:flex;flex-direction:column;gap:10px;align-items:flex-end;pointer-events:auto;}
.skill-float-btn:nth-child(1){transform:translateX(0);}
.skill-float-btn:nth-child(2){transform:translateX(-10px);}
.skill-float-btn:nth-child(3){transform:translateX(6px);}
.skill-float-btn:nth-child(4){transform:translateX(-6px);}"""

BUILD_KGSVG_OLD_START = "function buildKGSVG(kg) {"
BUILD_KGSVG_OLD_END = "  return svg;\n}"

BUILD_KGSVG_NEW = r'''function buildKGSVG(kg) {
  var dims = kg.children || [];
  var cx = 0, cy = 0;
  var STAGGER = [0, 0.16, -0.11, 0.19, -0.07, 0.14, -0.18, 0.09];
  var RADII = [88, 102, 96, 110, 94, 108, 100, 104];

  function parsePct(p) {
    if (!p) return 0;
    return parseFloat(String(p).replace('%', '')) || 0;
  }
  function colorHex(c) {
    if (!c) return '#0066FF';
    var m = String(c).match(/var\(--(\w+)\)/);
    if (!m) return c;
    var map = { red:'#FF3333', blue:'#0066FF', green:'#00CC44', fg:'#111', cyan:'#00CCCC', yellow:'#FFCC00', orange:'#FF8800', purple:'#9933FF' };
    return map[m[1]] || '#0066FF';
  }
  function truncLabel(text, max) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
  function estimateLabelW(text, fs) {
    return Math.max(24, (text || '').length * fs * 0.58);
  }
  function arcPath(cx, cy, r0, r1, a0, a1) {
    var x0o = cx + Math.cos(a0) * r1, y0o = cy + Math.sin(a0) * r1;
    var x1o = cx + Math.cos(a1) * r1, y1o = cy + Math.sin(a1) * r1;
    var x1i = cx + Math.cos(a1) * r0, y1i = cy + Math.sin(a1) * r0;
    var x0i = cx + Math.cos(a0) * r0, y0i = cy + Math.sin(a0) * r0;
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + x0o + ',' + y0o + ' A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + x1o + ',' + y1o +
      ' L' + x1i + ',' + y1i + ' A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + x0i + ',' + y0i + ' Z';
  }

  var positions = [];
  var lines = '', circles = '', labels = '', pies = '';
  var delay = 0;
  var minX = -9999, maxX = 9999, minY = -9999, maxY = 9999;
  function trackBounds(x, y, r, label, fs) {
    var hw = estimateLabelW(label, fs) / 2;
    minX = Math.min(minX, x - r - hw);
    maxX = Math.max(maxX, x + r + hw);
    minY = Math.min(minY, y - r - fs);
    maxY = Math.max(maxY, y + r + fs * 1.6);
  }

  var totalPct = dims.reduce(function(s, d) { return s + parsePct(d.pct); }, 0) || 100;
  var pieStart = -Math.PI / 2;
  var innerR = 34, outerR = 50;
  dims.forEach(function(d, i) {
    var slice = (parsePct(d.pct) / totalPct) * Math.PI * 2;
    if (slice > 0.02) {
      pies += '<path class="kg-pie-slice kg-svg-node-anim" data-id="' + d.id + '_pie" data-label="' + d.label + '" data-pct="' + (d.pct || '') + '" d="' +
        arcPath(cx, cy, innerR, outerR, pieStart, pieStart + slice) + '" fill="' + colorHex(d.color) + '" stroke="#000" stroke-width="1.2" style="animation-delay:' + delay + 'ms;"/>';
    }
    pieStart += slice;
  });

  var rootLabel = kg.label || 'ROOT';
  var rootR = Math.max(30, Math.min(48, 26 + rootLabel.length * 1.2));
  trackBounds(cx, cy, outerR + 8, rootLabel, 11);
  circles += '<g class="kg-svg-node kg-svg-node-anim" data-id="' + kg.id + '" data-label="' + rootLabel + '" data-pct="' + (kg.pct || '') + '" style="animation-delay:' + delay + 'ms;">';
  circles += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rootR + '" fill="var(--fg)" stroke="#000" stroke-width="2" class="kg-svg-circle"/>';
  circles += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rootR + 6) + '" fill="none" stroke="#000" stroke-width="1" opacity=".15" class="kg-svg-ring"/>';
  circles += '</g>';
  labels += '<text class="kg-svg-label-preview" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" fill="#fff" font-size="10" font-weight="900">' + truncLabel(rootLabel, 8) + '</text>';
  labels += '<text class="kg-svg-label-full" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" fill="#fff" font-size="10" font-weight="900">' + rootLabel + '</text>';
  delay += 60;

  dims.forEach(function(d, i) {
    var baseAngle = (i / Math.max(dims.length, 1)) * Math.PI * 2 - Math.PI / 2;
    var angle = baseAngle + (STAGGER[i % STAGGER.length] || 0);
    var r = RADII[i % RADII.length] + (i % 2) * 8;
    var dx = cx + Math.cos(angle) * r;
    var dy = cy + Math.sin(angle) * r;
    var nr = 12 + parsePct(d.pct) * 0.25;
    lines += '<line class="kg-svg-link" data-from="' + kg.id + '" data-to="' + d.id + '" x1="' + cx + '" y1="' + cy + '" x2="' + dx + '" y2="' + dy + '" stroke="#000" stroke-width="' + (parsePct(d.pct) / 10 + 1) + '" opacity=".45"/>';
    trackBounds(dx, dy, nr + 6, d.label, 8);
    circles += '<g class="kg-svg-node kg-svg-node-anim" data-id="' + d.id + '" data-label="' + d.label + '" data-pct="' + (d.pct || '') + '" style="animation-delay:' + delay + 'ms;">';
    circles += '<circle cx="' + dx + '" cy="' + dy + '" r="' + nr + '" fill="' + colorHex(d.color) + '" stroke="#000" stroke-width="2" class="kg-svg-circle"/>';
    circles += '</g>';
    labels += '<text class="kg-svg-label-preview" x="' + dx + '" y="' + (dy + 3) + '" text-anchor="middle" fill="#fff" font-size="7" font-weight="900">' + truncLabel(d.label, 6) + '</text>';
    labels += '<text class="kg-svg-label-full" x="' + dx + '" y="' + (dy + 3) + '" text-anchor="middle" fill="#fff" font-size="7" font-weight="900">' + d.label + '</text>';
    if (d.pct) {
      labels += '<text x="' + dx + '" y="' + (dy + nr + 10) + '" text-anchor="middle" fill="#000" font-size="6" font-weight="900">' + d.pct + '</text>';
    }
    delay += 55;

    if (d.children) {
      d.children.forEach(function(ref, ri) {
        var jitter = (ri % 3 - 1) * 0.12 + (i % 2 ? 0.06 : -0.04);
        var rAngle = angle + ((ri - (d.children.length - 1) / 2) * 0.38) + jitter;
        var rr = r + 42 + (ri % 2) * 16 + (i % 3) * 6;
        var rx = cx + Math.cos(rAngle) * rr;
        var ry = cy + Math.sin(rAngle) * rr;
        lines += '<line class="kg-svg-link" data-from="' + d.id + '" data-to="' + ref.id + '" x1="' + dx + '" y1="' + dy + '" x2="' + rx + '" y2="' + ry + '" stroke="#000" stroke-width="1" opacity=".22" stroke-dasharray="3,3"/>';
        trackBounds(rx, ry, 12, ref.label, 6);
        circles += '<g class="kg-svg-node kg-svg-node-anim" data-id="' + ref.id + '" data-label="' + ref.label + '" data-pct="' + (ref.pct || '') + '" style="animation-delay:' + delay + 'ms;">';
        circles += '<circle cx="' + rx + '" cy="' + ry + '" r="10" fill="' + colorHex(ref.color) + '" stroke="#000" stroke-width="1.5" class="kg-svg-circle"/>';
        circles += '</g>';
        labels += '<text class="kg-svg-label-preview" x="' + rx + '" y="' + (ry + 2) + '" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700">' + truncLabel(ref.label, 5) + '</text>';
        labels += '<text class="kg-svg-label-full" x="' + rx + '" y="' + (ry + 2) + '" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700">' + ref.label + '</text>';
        delay += 35;

        if (ref.children) {
          ref.children.forEach(function(leaf, li) {
            var lJitter = (li % 2 ? 0.1 : -0.08) + (ri % 2) * 0.05;
            var lAngle = rAngle + ((li - (ref.children.length - 1) / 2) * 0.28) + lJitter;
            var lr = rr + 28 + (li % 2) * 12;
            var lx = cx + Math.cos(lAngle) * lr;
            var ly = cy + Math.sin(lAngle) * lr;
            lines += '<line class="kg-svg-link" data-from="' + ref.id + '" data-to="' + leaf.id + '" x1="' + rx + '" y1="' + ry + '" x2="' + lx + '" y2="' + ly + '" stroke="#000" stroke-width="0.7" opacity=".15" stroke-dasharray="2,2"/>';
            trackBounds(lx, ly, 8, leaf.label, 5);
            circles += '<g class="kg-svg-node kg-svg-node-anim" data-id="' + leaf.id + '" data-label="' + leaf.label + '" data-pct="' + (leaf.pct || '') + '" style="animation-delay:' + delay + 'ms;">';
            circles += '<circle cx="' + lx + '" cy="' + ly + '" r="6" fill="' + colorHex(leaf.color) + '" stroke="#000" stroke-width="1" class="kg-svg-circle"/>';
            circles += '</g>';
            labels += '<text class="kg-svg-label-preview" x="' + lx + '" y="' + (ly + 2) + '" text-anchor="middle" fill="#333" font-size="4.5" font-weight="700">' + truncLabel(leaf.label, 4) + '</text>';
            labels += '<text class="kg-svg-label-full" x="' + lx + '" y="' + (ly + 2) + '" text-anchor="middle" fill="#333" font-size="4.5" font-weight="700">' + leaf.label + '</text>';
            delay += 22;
          });
        }
      });
    }
  });

  var pad = 28;
  var vbW = maxX - minX + pad * 2;
  var vbH = maxY - minY + pad * 2;
  var vbX = minX - pad;
  var vbY = minY - pad;
  var bgR = Math.max(Math.sqrt(vbW * vbW + vbH * vbH) / 2, outerR + rootR + 20);
  var bg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + bgR + '" fill="#FAFAFA" stroke="#000" stroke-width="1.5" opacity=".95"/>';
  var svg = '<svg viewBox="' + vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">' +
    bg + lines + pies + circles + labels + '</svg>';
  return svg;
}'''

HISTORY_SAVE_OLD = """function saveVersion() {
  // Generate a thumbnail by compositing first 3 frames into a small preview
  var thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 144; thumbCanvas.height = 90;
  var tctx = thumbCanvas.getContext('2d');
  tctx.fillStyle = '#F0F0F0'; tctx.fillRect(0, 0, 144, 90);
  var previewFrames = appState.frames.slice(0, 3);
  var tw = 48, th = 90;
  previewFrames.forEach(function(f, i) {
    var x = i * tw;
    tctx.strokeStyle = '#000'; tctx.lineWidth = 1; tctx.strokeRect(x, 0, tw, th);
    if (appState.generatedImages[f.id]) {
      var img = new Image();
      img.src = appState.generatedImages[f.id];
      // Use try-catch for sync draw from cached data URL
      try { tctx.drawImage(img, x, 0, tw, th); } catch(e) {}
    } else {
      try {
        var mock = generateCanvasImage(f, appState.style);
        tctx.drawImage(mock, x, 0, tw, th);
      } catch(e) {}
    }
  });
  var thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);

  var ver = {
    id: Date.now(),
    time: new Date().toLocaleString('zh-CN'),
    name: 'V' + (appState.history.length + 1) + ' — ' + new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}),
    thumb: thumbDataUrl,
    state: {
      sceneText: appState.sceneText,
      answers: Object.assign({}, appState.answers),
      frameCount: appState.frameCount,
      style: Object.assign({}, appState.style),
      frames: appState.frames.map(function(f) { return Object.assign({}, f); })
      // generatedImages intentionally omitted to stay within localStorage limits
    }
  };
  appState.history.unshift(ver);
  if (appState.history.length > 20) appState.history.pop();
  persistHistory();
  renderHistory();
  var btn = event.target.closest('.b-btn');
  btn.textContent = '✅ SAVED!';
  setTimeout(function() { btn.textContent = '💾 SAVE'; }, 1500);
}"""

HISTORY_SAVE_NEW = """function buildHistorySnapshot() {
  var thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 144; thumbCanvas.height = 90;
  var tctx = thumbCanvas.getContext('2d');
  tctx.fillStyle = '#F0F0F0'; tctx.fillRect(0, 0, 144, 90);
  var previewFrames = appState.frames.slice(0, 3);
  var tw = 48, th = 90;
  previewFrames.forEach(function(f, i) {
    var x = i * tw;
    tctx.strokeStyle = '#000'; tctx.lineWidth = 1; tctx.strokeRect(x, 0, tw, th);
    if (appState.generatedImages[f.id]) {
      try {
        var imgEl = new Image();
        imgEl.src = appState.generatedImages[f.id];
        tctx.drawImage(imgEl, x, 0, tw, th);
      } catch(e) {}
    } else {
      try {
        var mock = generateCanvasImage(f, appState.style);
        tctx.drawImage(mock, x, 0, tw, th);
      } catch(e) {}
    }
  });
  return {
    id: Date.now(),
    time: new Date().toLocaleString('zh-CN'),
    name: 'V' + (appState.history.length + 1) + ' — ' + new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}),
    thumb: thumbCanvas.toDataURL('image/jpeg', 0.55),
    state: {
      sceneText: appState.sceneText,
      answers: Object.assign({}, appState.answers),
      frameCount: appState.frameCount,
      style: Object.assign({}, appState.style),
      frames: appState.frames.map(function(f) { return JSON.parse(JSON.stringify(f)); }),
      genPrompts: appState.genPrompts.map(function(p) { return Object.assign({}, p); }),
      parseResult: appState.parseResult ? JSON.parse(JSON.stringify(appState.parseResult)) : null,
      parsed: appState.parsed,
      activeSkillMode: appState.activeSkillMode,
      generatedImages: Object.keys(appState.generatedImages).reduce(function(o, k) {
        var v = appState.generatedImages[k];
        if (v && v.length < 120000) o[k] = v;
        return o;
      }, {})
    }
  };
}

function saveVersion(ev) {
  if (!appState.frames.length && !appState.sceneText) {
    alert('当前没有可保存的内容，请先生成分镜');
    return;
  }
  var ver = buildHistorySnapshot();
  appState.history.unshift(ver);
  if (appState.history.length > 10) appState.history = appState.history.slice(0, 10);
  appState.historyIndex = 0;
  persistHistory();
  renderHistory();

  var btn = ev && ev.target ? ev.target.closest('.b-btn') : document.querySelector('.b-btn[onclick*="saveVersion"]');
  if (btn) { btn.textContent = '✅ SAVED!'; setTimeout(function() { btn.textContent = '💾 SAVE'; }, 1500); }

  if (appState.jimeng.connected) {
    fetch(jimengBaseUrl() + '/history/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ver)
    }).then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.history) {
          appState.history = data.history.slice(0, 10);
          persistHistory();
          renderHistory();
        }
      }).catch(function(e) { console.warn('Server history save failed, local backup kept:', e); });
  }
}"""

LOAD_VERSION_OLD = """function loadVersion(idx) {
  var ver = appState.history[idx];
  if (!ver) return;
  appState.generatedImages = {};
  Object.assign(appState, ver.state);
  appState.historyIndex = idx;
  inputEl.value = appState.sceneText || '';
  if (appState.parsed) document.getElementById('questionsPanel').classList.add('show');
  renderDraftBoard(); refreshDraftTags();
  renderHistory();
  document.querySelectorAll('.history-item').forEach(function(item, i) {
    item.classList.toggle('current', i === idx);
  });
}"""

LOAD_VERSION_NEW = """function loadVersion(idx) {
  var ver = appState.history[idx];
  if (!ver || !ver.state) return;
  var st = ver.state;
  appState.sceneText = st.sceneText || '';
  appState.answers = st.answers || {};
  appState.frameCount = st.frameCount || 6;
  appState.style = st.style || appState.style;
  appState.frames = (st.frames || []).map(function(f) { return JSON.parse(JSON.stringify(f)); });
  appState.genPrompts = (st.genPrompts || []).map(function(p) { return Object.assign({}, p); });
  appState.parseResult = st.parseResult || null;
  appState.parsed = !!st.parsed;
  appState.activeSkillMode = st.activeSkillMode || appState.activeSkillMode;
  appState.generatedImages = st.generatedImages ? Object.assign({}, st.generatedImages) : {};
  appState.historyIndex = idx;
  inputEl.value = appState.sceneText || '';
  if (appState.parsed) document.getElementById('questionsPanel').classList.add('show');
  else document.getElementById('questionsPanel').classList.remove('show');
  if (appState.activeSkillMode) selectSkillMode(appState.activeSkillMode, false);
  renderDraftBoard(); refreshDraftTags();
  if (appState.currentPage === 'render') renderRenderPage();
  renderHistory();
  document.querySelectorAll('.history-item').forEach(function(item, i) {
    item.classList.toggle('current', i === idx);
  });
}"""

PERSIST_OLD = """function persistHistory() { try { localStorage.setItem('sb_history_v3', JSON.stringify(appState.history)); } catch(e) {} }
function loadPersistedHistory() { try { var raw = localStorage.getItem('sb_history_v3'); if (raw) appState.history = JSON.parse(raw); } catch(e) {} }"""

PERSIST_NEW = """var HISTORY_MAX = 10;
function persistHistory() {
  try {
    var slim = appState.history.slice(0, HISTORY_MAX).map(function(v) {
      var copy = JSON.parse(JSON.stringify(v));
      if (copy.state && copy.state.generatedImages) {
        copy.state.generatedImages = Object.keys(copy.state.generatedImages).reduce(function(o, k) {
          var img = copy.state.generatedImages[k];
          if (img && img.length < 80000) o[k] = img;
          return o;
        }, {});
      }
      return copy;
    });
    localStorage.setItem('sb_history_v4', JSON.stringify(slim));
  } catch(e) { console.warn('localStorage history full:', e); }
}
function loadPersistedHistory() {
  try {
    var raw = localStorage.getItem('sb_history_v4') || localStorage.getItem('sb_history_v3');
    if (raw) {
      appState.history = JSON.parse(raw).slice(0, HISTORY_MAX);
      renderHistory();
    }
  } catch(e) {}
  if (appState.jimeng && appState.jimeng.connected) syncHistoryFromServer();
}
function syncHistoryFromServer() {
  fetch(jimengBaseUrl() + '/history/list', { method: 'GET', signal: AbortSignal.timeout(5000) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.history && data.history.length) {
        appState.history = data.history.slice(0, HISTORY_MAX);
        persistHistory();
        renderHistory();
      }
    }).catch(function() {});
}"""

BTN_SAVE_OLD = '<button class="b-btn" onclick="saveVersion()">💾 SAVE</button>'
BTN_SAVE_NEW = '<button class="b-btn" onclick="saveVersion(event)">💾 SAVE</button>'

RENDER_HISTORY_OLD = """function renderHistory() {
  var list = document.getElementById('historyList');
  document.getElementById('historyCount').textContent = appState.history.length;
  if (appState.history.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;font-weight:700;color:#999;">暂无保存版本<br>点击上方 SAVE 保存当前状态</div>';
    return;
  }
  list.innerHTML = appState.history.map(function(v, i) {
    var thumbHtml = v.thumb ? '<div class="history-thumb"><img src="' + v.thumb + '" alt="preview"></div>' : '';
    return '<div class="history-item ' + (i === appState.historyIndex ? 'current' : '') + '" onclick="loadVersion(' + i + ')">' + thumbHtml + '<div class="history-time">' + (v.time.split(' ')[1] || '') + '</div><div class="history-name">' + v.name + '</div><div class="history-delete" onclick="deleteVersion(' + i + ',event)">×</div></div>';
  }).join('');
}"""

RENDER_HISTORY_NEW = """function renderHistory() {
  var list = document.getElementById('historyList');
  var countEl = document.getElementById('historyCount');
  var shown = appState.history.slice(0, HISTORY_MAX);
  if (countEl) countEl.textContent = shown.length + '/10';
  if (!list) return;
  if (shown.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;font-weight:700;color:#999;">暂无保存版本<br>点击 SAVE 真实保存当前分镜</div>';
    return;
  }
  list.innerHTML = shown.map(function(v, i) {
    var thumbHtml = v.thumb ? '<div class="history-thumb"><img src="' + v.thumb + '" alt="preview"></div>' : '';
    var timePart = (v.time || '').split(' ')[1] || v.time || '';
    var frameHint = (v.state && v.state.frames) ? v.state.frames.length + '帧' : '';
    return '<div class="history-item ' + (i === appState.historyIndex ? 'current' : '') + '" onclick="loadVersion(' + i + ')">' + thumbHtml +
      '<div class="history-time">' + timePart + '</div>' +
      '<div class="history-name">' + v.name + (frameHint ? ' <span style="font-size:9px;color:#888;">· ' + frameHint + '</span>' : '') + '</div>' +
      '<div class="history-delete" onclick="deleteVersion(' + i + ',event)">×</div></div>';
  }).join('');
}"""

INIT_SYNC = """        return loadStyleRefs();
      }
    })
    .then(function() { return syncLoraModelsFromServer(); })"""

INIT_SYNC_NEW = """        return loadStyleRefs();
      }
    })
    .then(function() { return syncLoraModelsFromServer(); })
    .then(function() { syncHistoryFromServer(); })"""


def extract_function(text: str, start_marker: str) -> tuple[str, int, int]:
    start = text.index(start_marker)
    depth = 0
    i = start
    while i < len(text):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                return text[start : i + 1], start, i + 1
        i += 1
    raise ValueError(f"Could not find end of function starting at {start_marker}")


def main() -> None:
    text = HTML.read_text(encoding="utf-8")
    replacements = [
        (CSS_OLD, CSS_NEW),
        (SKILL_FLOAT_OLD, SKILL_FLOAT_NEW),
        (HISTORY_SAVE_OLD, HISTORY_SAVE_NEW),
        (LOAD_VERSION_OLD, LOAD_VERSION_NEW),
        (PERSIST_OLD, PERSIST_NEW),
        (BTN_SAVE_OLD, BTN_SAVE_NEW),
        (RENDER_HISTORY_OLD, RENDER_HISTORY_NEW),
        (INIT_SYNC, INIT_SYNC_NEW),
    ]
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f"Patch block not found:\n{old[:80]}...")
        text = text.replace(old, new, 1)

    old_fn, start, end = extract_function(text, "function buildKGSVG(kg) {")
    text = text[:start] + BUILD_KGSVG_NEW + text[end:]

    HTML.write_text(text, encoding="utf-8")
    print(f"Patched {HTML}")


if __name__ == "__main__":
    main()
