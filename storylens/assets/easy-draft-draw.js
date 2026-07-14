/**
 * Easy Draft Draw — 抽象简笔画分镜草图
 * 体现：1.环境基本内容 2.人物相对位置/大小/画面位置 3.简单文字叙述
 * 参考风格：refeasydraw.png
 */
(function (global) {
  'use strict';

  var SHOT_SCALE = {
    '远景': 0.26,
    '全景': 0.40,
    '中景': 0.56,
    '近景': 0.72,
    '特写': 0.92
  };

  var POS_MAP = {
    center: { x: 50, y: 70 },
    left: { x: 24, y: 70 },
    right: { x: 76, y: 70 },
    top: { x: 50, y: 42 },
    bottom: { x: 50, y: 82 },
    'far-left': { x: 14, y: 72 },
    'far-right': { x: 86, y: 72 }
  };

  var EXTRA_POS = ['left', 'right', 'far-left', 'far-right', 'top', 'bottom'];

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shotScale(shot) {
    return SHOT_SCALE[shot] || 0.56;
  }

  function resolvePos(char, index, total) {
    if (char.p && POS_MAP[char.p]) return POS_MAP[char.p];
    if (total <= 1) return POS_MAP.center;
    var slots = total === 2
      ? [POS_MAP.left, POS_MAP.right]
      : [POS_MAP['far-left'], POS_MAP.left, POS_MAP.center, POS_MAP.right, POS_MAP['far-right']];
    return slots[index % slots.length];
  }

  function envType(set) {
    var s = String(set || '').toLowerCase();
    if (/街|路|十字|巷|广场/.test(s)) return 'street';
    if (/室|房|屋|家|厅|店|办公|教室/.test(s)) return 'indoor';
    if (/森林|山|海|河|湖|公园|自然|郊/.test(s)) return 'nature';
    if (/黄昏|夕阳|傍晚|日落/.test(s)) return 'sunset';
    if (/夜|深夜|月光|星空/.test(s)) return 'night';
    return 'generic';
  }

  function wrapText(text, maxLen) {
    var t = String(text || '').replace(/\s+/g, '');
    if (t.length <= maxLen) return [t];
    var lines = [];
    for (var i = 0; i < t.length; i += maxLen) lines.push(t.slice(i, i + maxLen));
    return lines.slice(0, 2);
  }

  function poseForAction(action) {
    var a = String(action || '站立');
    if (/跑|追|奔/.test(a)) return 'run';
    if (/回|望|看|转/.test(a)) return 'lookback';
    if (/低|俯|蹲|弯/.test(a)) return 'bend';
    if (/握|拿|拾|捡|伸/.test(a)) return 'reach';
    if (/坐/.test(a)) return 'sit';
    if (/挥|举|抬/.test(a)) return 'wave';
    return 'stand';
  }

  /** 环境简笔画 SVG */
  function drawEnvSVG(set, mood) {
    var type = envType(set);
    var parts = [];
    var ink = 'rgba(0,0,0,0.22)';
    var inkLight = 'rgba(0,0,0,0.12)';

    // 地平线
    parts.push(
      '<line x1="4" y1="68" x2="96" y2="68" stroke="' + ink + '" stroke-width="0.6"/>',
      '<line x1="4" y1="68.5" x2="96" y2="68.5" stroke="' + inkLight + '" stroke-width="0.3" stroke-dasharray="1.5,2"/>'
    );

    if (type === 'street') {
      parts.push(
        '<rect x="6" y="42" width="14" height="26" fill="none" stroke="' + inkLight + '" stroke-width="0.5"/>',
        '<rect x="22" y="36" width="11" height="32" fill="none" stroke="' + inkLight + '" stroke-width="0.5"/>',
        '<rect x="67" y="40" width="16" height="28" fill="none" stroke="' + inkLight + '" stroke-width="0.5"/>',
        '<rect x="84" y="44" width="10" height="24" fill="none" stroke="' + inkLight + '" stroke-width="0.5"/>',
        '<line x1="50" y1="68" x2="50" y2="88" stroke="' + inkLight + '" stroke-width="0.4" stroke-dasharray="2,2"/>',
        '<line x1="8" y1="78" x2="92" y2="78" stroke="' + inkLight + '" stroke-width="0.35" stroke-dasharray="2,3"/>'
      );
    } else if (type === 'indoor') {
      parts.push(
        '<line x1="4" y1="68" x2="4" y2="22" stroke="' + ink + '" stroke-width="0.55"/>',
        '<line x1="4" y1="22" x2="96" y2="22" stroke="' + ink + '" stroke-width="0.55"/>',
        '<line x1="96" y1="22" x2="96" y2="68" stroke="' + inkLight + '" stroke-width="0.45"/>',
        '<rect x="72" y="30" width="16" height="12" fill="none" stroke="' + inkLight + '" stroke-width="0.4"/>',
        '<line x1="80" y1="30" x2="80" y2="42" stroke="' + inkLight + '" stroke-width="0.3"/>',
        '<line x1="72" y1="36" x2="88" y2="36" stroke="' + inkLight + '" stroke-width="0.3"/>',
        '<rect x="58" y="58" width="22" height="10" fill="none" stroke="' + inkLight + '" stroke-width="0.4"/>',
        '<line x1="58" y1="62" x2="80" y2="62" stroke="' + inkLight + '" stroke-width="0.3"/>'
      );
    } else if (type === 'nature') {
      parts.push(
        '<path d="M4 68 Q25 52 50 58 T96 68" fill="none" stroke="' + inkLight + '" stroke-width="0.5"/>',
        '<line x1="18" y1="68" x2="18" y2="48" stroke="' + ink + '" stroke-width="0.45"/>',
        '<circle cx="18" cy="44" r="6" fill="none" stroke="' + ink + '" stroke-width="0.45"/>',
        '<line x1="82" y1="68" x2="82" y2="50" stroke="' + ink + '" stroke-width="0.45"/>',
        '<circle cx="82" cy="46" r="5" fill="none" stroke="' + ink + '" stroke-width="0.45"/>'
      );
    } else {
      parts.push(
        '<path d="M8 68 Q30 58 55 62 T92 68" fill="none" stroke="' + inkLight + '" stroke-width="0.4"/>',
        '<ellipse cx="78" cy="28" rx="9" ry="5" fill="none" stroke="' + inkLight + '" stroke-width="0.35"/>'
      );
    }

    if (type === 'sunset' || /黄昏|夕阳/.test(String(set || ''))) {
      parts.push(
        '<circle cx="82" cy="26" r="7" fill="none" stroke="rgba(180,90,40,0.35)" stroke-width="0.5"/>',
        '<line x1="82" y1="14" x2="82" y2="10" stroke="rgba(180,90,40,0.25)" stroke-width="0.35"/>',
        '<line x1="94" y1="26" x2="98" y2="26" stroke="rgba(180,90,40,0.25)" stroke-width="0.35"/>'
      );
    }
    if (type === 'night' || /夜/.test(String(mood || '') + String(set || ''))) {
      parts.push('<circle cx="84" cy="24" r="4" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.15)" stroke-width="0.35"/>');
    }

    return parts.join('');
  }

  /** 火柴人简笔画 SVG（局部坐标，脚底为 0,0） */
  function stickFigureSVG(action, name) {
    var pose = poseForAction(action);
    var parts = [];
    var sw = 0.9;

    // 头
    parts.push('<circle cx="0" cy="-14" r="3.2" fill="none" stroke="#111" stroke-width="' + sw + '"/>');

    // 身体
    parts.push('<line x1="0" y1="-10.8" x2="0" y2="-2" stroke="#111" stroke-width="' + sw + '"/>');

    var armL, armR, legL, legR, headDx = 0;
    if (pose === 'run') {
      armL = [-5, -8, -8, -3]; armR = [5, -9, 9, -4];
      legL = [-2.5, -2, -5, 2]; legR = [2.5, -2, 6, 1];
    } else if (pose === 'lookback') {
      headDx = 1.2;
      armL = [-4, -8, -7, -5]; armR = [4, -8, 6, -11];
      legL = [-2, -2, -3.5, 0]; legR = [2, -2, 3.5, 0];
    } else if (pose === 'bend') {
      parts.pop();
      parts.push('<line x1="0" y1="-10.8" x2="2" y2="-4" stroke="#111" stroke-width="' + sw + '"/>');
      armL = [2, -8, 5, -3]; armR = [2, -7, -2, -4];
      legL = [2, -4, -1, 0]; legR = [2, -4, 4, 0];
    } else if (pose === 'reach') {
      armL = [-4, -8, -3, -5]; armR = [4, -8, 8, -5];
      legL = [-2, -2, -3, 0]; legR = [2, -2, 3, 0];
      parts.push('<rect x="6" y="-6" width="4" height="3" fill="none" stroke="#111" stroke-width="0.5" transform="rotate(-10 8 -4.5)"/>');
    } else if (pose === 'sit') {
      armL = [-4, -8, -6, -4]; armR = [4, -8, 6, -4];
      legL = [-2, -2, -6, -2]; legR = [2, -2, 6, -2];
      parts.push('<line x1="-6" y1="-2" x2="6" y2="-2" stroke="#111" stroke-width="' + sw + '"/>');
    } else if (pose === 'wave') {
      armL = [-4, -8, -7, -5]; armR = [4, -8, 7, -13];
      legL = [-2, -2, -3, 0]; legR = [2, -2, 3, 0];
    } else {
      armL = [-4, -8, -7, -4]; armR = [4, -8, 7, -4];
      legL = [-2, -2, -3.5, 0]; legR = [2, -2, 3.5, 0];
    }

    if (headDx) {
      parts[0] = '<circle cx="' + headDx + '" cy="-14" r="3.2" fill="none" stroke="#111" stroke-width="' + sw + '"/>';
    }

    parts.push(
      '<line x1="' + armL[0] + '" y1="' + armL[1] + '" x2="' + armL[2] + '" y2="' + armL[3] + '" stroke="#111" stroke-width="' + sw + '"/>',
      '<line x1="' + armR[0] + '" y1="' + armR[1] + '" x2="' + armR[2] + '" y2="' + armR[3] + '" stroke="#111" stroke-width="' + sw + '"/>',
      '<line x1="' + legL[0] + '" y1="' + legL[1] + '" x2="' + legL[2] + '" y2="' + legL[3] + '" stroke="#111" stroke-width="' + sw + '"/>',
      '<line x1="' + legR[0] + '" y1="' + legR[1] + '" x2="' + legR[2] + '" y2="' + legR[3] + '" stroke="#111" stroke-width="' + sw + '"/>'
    );

    if (name) {
      parts.push('<text x="0" y="-19" text-anchor="middle" fill="#111" font-size="2.8" font-weight="700">' + esc(name) + '</text>');
    }
    if (action) {
      parts.push('<text x="0" y="4.5" text-anchor="middle" fill="#555" font-size="2.2" font-weight="600">' + esc(action) + '</text>');
    }

    return parts.join('');
  }

  function drawCharSVG(char, index, total, shot) {
    var pos = resolvePos(char, index, total);
    var scale = shotScale(shot);
    if (total > 1 && (char.p === 'left' || char.p === 'far-left')) scale *= 0.92;
    if (total > 1 && (char.p === 'right' || char.p === 'far-right')) scale *= 0.92;
    if (char.p === 'top') scale *= 1.05;

    return (
      '<g transform="translate(' + pos.x + ',' + pos.y + ') scale(' + scale + ')">' +
      stickFigureSVG(char.a, char.n) +
      '<circle cx="0" cy="0" r="8" fill="none" stroke="rgba(255,51,51,0.15)" stroke-width="0.4" stroke-dasharray="1,1"/>' +
      '</g>'
    );
  }

  /**
   * 生成单帧 Easy Draft SVG（viewBox 0 0 100 100）
   */
  function buildEasyDraftSVG(frame) {
    if (!frame) return '';
    var chars = frame.chars || [];
    if (!chars.length) chars = [{ n: '角色', p: 'center', a: '出现' }];

    var guides = [1, 2].map(function (i) {
      var p = (100 * i / 3).toFixed(1);
      return (
        '<line x1="' + p + '" y1="0" x2="' + p + '" y2="88" stroke="#000" stroke-width="0.35" stroke-dasharray="2,2" opacity="0.12"/>' +
        '<line x1="0" y1="' + p + '" x2="100" y2="' + p + '" stroke="#000" stroke-width="0.35" stroke-dasharray="2,2" opacity="0.12"/>'
      );
    }).join('');

    var charSvg = chars.map(function (c, i) {
      return drawCharSVG(c, i, chars.length, frame.shot);
    }).join('');

    var narrLines = wrapText(frame.desc, 18);
    var narrSvg = narrLines.map(function (line, i) {
      return '<text x="50" y="' + (93 + i * 3.2) + '" text-anchor="middle" fill="#222" font-size="2.6" font-weight="600">' + esc(line) + '</text>';
    }).join('');

    var shotHighlight = frame.shot === '特写';

    return (
      '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="100" height="100" fill="#F7F4EE"/>' +
      guides +
      drawEnvSVG(frame.set, frame.mood) +
      '<text x="50" y="6" text-anchor="middle" fill="#888" font-size="3" font-weight="700">' + esc(frame.set || '场景') + '</text>' +
      charSvg +
      '<rect x="2" y="2" width="11" height="8" fill="#111" stroke="#111" stroke-width="0.4"/>' +
      '<text x="7.5" y="7.5" text-anchor="middle" fill="#fff" font-size="4" font-weight="900">' + esc(frame.id) + '</text>' +
      '<rect x="74" y="2" width="24" height="8" fill="' + (shotHighlight ? '#FF3333' : '#111') + '" stroke="#111" stroke-width="0.4"/>' +
      '<text x="86" y="7.2" text-anchor="middle" fill="#fff" font-size="3" font-weight="900">' + esc(frame.shot || '中景') + '</text>' +
      '<text x="97" y="14" text-anchor="end" fill="#999" font-size="2.5" font-style="italic">' + esc(frame.mood || '') + '</text>' +
      '<rect x="0" y="88" width="100" height="12" fill="rgba(0,0,0,0.04)"/>' +
      '<line x1="4" y1="88" x2="96" y2="88" stroke="#111" stroke-width="0.35" opacity="0.2"/>' +
      narrSvg +
      '</svg>'
    );
  }

  /** Canvas 绘制（供 Mock 生图 / 导出） */
  function drawEasyDraftCanvas(ctx, W, H, frame) {
    if (!ctx || !frame) return;
    ctx.fillStyle = '#F7F4EE';
    ctx.fillRect(0, 0, W, H);

    // 三分线
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    for (var g = 1; g <= 2; g++) {
      ctx.beginPath(); ctx.moveTo(W * g / 3, 0); ctx.lineTo(W * g / 3, H * 0.88); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H * g / 3); ctx.lineTo(W, H * g / 3); ctx.stroke();
    }

    drawEnvCanvas(ctx, W, H, frame.set, frame.mood);

    var chars = frame.chars || [{ n: '角色', p: 'center', a: '出现' }];
    var baseScale = shotScale(frame.shot);
    chars.forEach(function (c, i) {
      var pos = resolvePos(c, i, chars.length);
      var sc = baseScale * (H / 100);
      var x = (pos.x / 100) * W;
      var y = (pos.y / 100) * H;
      drawStickCanvas(ctx, x, y, sc, c.a, c.n);
    });

    // 顶部场景
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = 'bold ' + Math.round(H * 0.028) + 'px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(frame.set || '场景', W / 2, H * 0.06);

    // 帧号
    ctx.fillStyle = '#111';
    ctx.fillRect(8, 8, 28, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(H * 0.035) + 'px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(frame.id), 22, H * 0.058);

    // 景别
    var shotW = 72;
    ctx.fillStyle = frame.shot === '特写' ? '#FF3333' : '#111';
    ctx.fillRect(W - shotW - 8, 8, shotW, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(H * 0.028) + 'px Inter, sans-serif';
    ctx.fillText(frame.shot || '中景', W - shotW / 2 - 8, H * 0.058);

    // 情绪
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'italic ' + Math.round(H * 0.022) + 'px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(frame.mood || '', W - 10, H * 0.1);

    // 底部叙述
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, H * 0.88, W, H * 0.12);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.moveTo(8, H * 0.88); ctx.lineTo(W - 8, H * 0.88); ctx.stroke();

    var lines = wrapText(frame.desc, 22);
    ctx.fillStyle = '#222';
    ctx.font = '600 ' + Math.round(H * 0.028) + 'px Inter, sans-serif';
    ctx.textAlign = 'center';
    lines.forEach(function (line, i) {
      ctx.fillText(line, W / 2, H * 0.93 + i * H * 0.035);
    });
  }

  function drawEnvCanvas(ctx, W, H, set, mood) {
    var type = envType(set);
    var gy = H * 0.68;
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W * 0.04, gy); ctx.lineTo(W * 0.96, gy); ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(W * 0.04, gy + 2); ctx.lineTo(W * 0.96, gy + 2); ctx.stroke();
    ctx.setLineDash([]);

    if (type === 'street') {
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.strokeRect(W * 0.06, H * 0.42, W * 0.14, H * 0.26);
      ctx.strokeRect(W * 0.67, H * 0.4, W * 0.16, H * 0.28);
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(W * 0.5, gy); ctx.lineTo(W * 0.5, H * 0.88); ctx.stroke();
      ctx.setLineDash([]);
    } else if (type === 'indoor') {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(W * 0.04, gy); ctx.lineTo(W * 0.04, H * 0.22); ctx.lineTo(W * 0.96, H * 0.22); ctx.stroke();
      ctx.strokeRect(W * 0.72, H * 0.3, W * 0.16, H * 0.12);
      ctx.strokeRect(W * 0.58, H * 0.58, W * 0.22, H * 0.1);
    } else if (type === 'nature') {
      ctx.beginPath();
      ctx.moveTo(W * 0.04, gy);
      ctx.quadraticCurveTo(W * 0.25, H * 0.52, W * 0.5, H * 0.58);
      ctx.quadraticCurveTo(W * 0.75, H * 0.52, W * 0.96, gy);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(W * 0.18, H * 0.44, H * 0.06, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W * 0.82, H * 0.46, H * 0.05, 0, Math.PI * 2); ctx.stroke();
    }

    if (type === 'sunset' || /黄昏|夕阳/.test(String(set || ''))) {
      ctx.strokeStyle = 'rgba(180,90,40,0.35)';
      ctx.beginPath(); ctx.arc(W * 0.82, H * 0.26, H * 0.07, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawStickCanvas(ctx, x, y, scale, action, name) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';

    var pose = poseForAction(action);
    ctx.beginPath(); ctx.arc(0, -14, 3.2, 0, Math.PI * 2); ctx.stroke();

    if (pose === 'bend') {
      ctx.beginPath(); ctx.moveTo(0, -10.8); ctx.lineTo(2, -4); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -10.8); ctx.lineTo(0, -2); ctx.stroke();
    }

    function limb(x1, y1, x2, y2) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    if (pose === 'run') {
      limb(-4, -8, -8, -3); limb(4, -9, 9, -4);
      limb(-2, -2, -5, 2); limb(2, -2, 6, 1);
    } else if (pose === 'lookback') {
      limb(-4, -8, -7, -5); limb(4, -8, 6, -11);
      limb(-2, -2, -3.5, 0); limb(2, -2, 3.5, 0);
    } else if (pose === 'reach') {
      limb(-4, -8, -3, -5); limb(4, -8, 8, -5);
      limb(-2, -2, -3, 0); limb(2, -2, 3, 0);
      ctx.strokeRect(6, -6, 4, 3);
    } else {
      limb(-4, -8, -7, -4); limb(4, -8, 7, -4);
      limb(-2, -2, -3.5, 0); limb(2, -2, 3.5, 0);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.font = 'bold 2.8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name || '', 0, -19);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = '600 2.2px Inter, sans-serif';
    ctx.fillText(action || '', 0, 4.5);

    ctx.restore();
  }

  var EasyDraftDraw = {
    buildEasyDraftSVG: buildEasyDraftSVG,
    drawEasyDraftCanvas: drawEasyDraftCanvas,
    shotScale: shotScale,
    resolvePos: resolvePos,
    envType: envType
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EasyDraftDraw;
  } else {
    global.EasyDraftDraw = EasyDraftDraw;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global));
