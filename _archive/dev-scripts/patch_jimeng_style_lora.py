#!/usr/bin/env python3
"""Patch storylens-generator.html: Jimeng keys, style-ref img2img, pseudo LoRA."""

from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "assets" / "storylens-generator.html"

DEFAULT_AK = ""
DEFAULT_SK = ""

HELPER_JS = """
// ══════════════════════════════════════════════
//  STYLE REF + PSEUDO LORA HELPERS
// ══════════════════════════════════════════════
var STYLE_REF_STRENGTH = 0.58;

function jimengBaseUrl() {
  var el = document.getElementById('jimengUrl');
  return (el ? el.value : appState.jimeng.url || 'http://127.0.0.1:18901').replace(/\\/+$/, '');
}

function loadStyleRefs() {
  return fetch(jimengBaseUrl() + '/style-refs', { method: 'GET', signal: AbortSignal.timeout(4000) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.styles) appState.styleRefs = data.styles;
      return appState.styleRefs;
    })
    .catch(function() { return appState.styleRefs; });
}

function getStyleReferenceImage(style, frameId, loraModel) {
  var url = jimengBaseUrl();
  if (style.type === 'lora' && loraModel) {
    if (loraModel.samplePreviews && loraModel.samplePreviews.length) {
      var idx = ((frameId || 1) - 1) % loraModel.samplePreviews.length;
      return Promise.resolve(loraModel.samplePreviews[idx]);
    }
    if (loraModel.folder && loraModel.images && loraModel.images.length) {
      var fi = ((frameId || 1) - 1) % loraModel.images.length;
      return fetch(url + '/lora/' + encodeURIComponent(loraModel.folder) + '/' + encodeURIComponent(loraModel.images[fi]))
        .then(function(r) { return r.blob(); })
        .then(function(blob) {
          return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.readAsDataURL(blob);
          });
        });
    }
  }
  var styleType = style.type === 'lora' ? 'sketch' : style.type;
  var files = (appState.styleRefs && appState.styleRefs[styleType]) || [];
  if (files.length) {
    var ri = ((frameId || 1) - 1) % files.length;
    return fetch(url + '/style-refs/' + encodeURIComponent(styleType) + '/' + encodeURIComponent(files[ri]))
      .then(function(r) { return r.blob(); })
      .then(function(blob) {
        return new Promise(function(resolve) {
          var reader = new FileReader();
          reader.onload = function() { resolve(reader.result); };
          reader.readAsDataURL(blob);
        });
      });
  }
  if (STYLE_PREVIEWS[styleType]) return Promise.resolve(STYLE_PREVIEWS[styleType]);
  return Promise.resolve(null);
}

function buildFramePrompt(frame, style, loraModel) {
  var parts = [frame.desc];
  var stylePrefix = {
    sketch: 'storylens sketch, pencil drawing, hand-drawn, rough lines, concept art',
    render: 'cinematic render, photorealistic, dramatic lighting, depth of field, high quality',
    anime: 'high saturation anime art style, vibrant colors, bold outlines, dynamic composition',
    street: 'Japanese street illustration style, fresh color palette, slice of life, clean lineart',
    lora: 'custom style transfer, consistent visual style'
  };
  var st = style.type === 'lora' ? 'lora' : style.type;
  parts.push(stylePrefix[st] || stylePrefix.sketch);
  if (frame.set) parts.push(frame.set);
  if (frame.mood) parts.push(frame.mood);
  var shotMap = {
    '特写': 'close-up shot', '中景': 'medium shot', '远景': 'wide shot',
    '全景': 'panoramic shot', '俯拍': 'bird eye view', '仰拍': 'low angle shot'
  };
  if (shotMap[frame.shot]) parts.push(shotMap[frame.shot]);
  frame.chars.forEach(function(c) { parts.push(c.a + ' ' + c.n); });
  if (style.colorMode === 'bw') parts.push('monochrome, black and white');
  if (style.dim === '3d') parts.push('3D render, volumetric lighting');
  if (loraModel && loraModel.trigger) parts.push(loraModel.trigger);
  return parts.join(', ');
}

function persistLoraModels() {
  try {
    localStorage.setItem('storylens_lora_models', JSON.stringify(appState.trainedModels.map(function(m) {
      return {
        name: m.name, folder: m.folder, time: m.time, files: m.files, steps: m.steps,
        trigger: m.trigger, rank: m.rank, lr: m.lr,
        samplePreviews: (m.samplePreviews || []).slice(0, 3)
      };
    })));
  } catch(e) {}
}

function loadPersistedLoraModels() {
  try {
    var raw = localStorage.getItem('storylens_lora_models');
    if (raw) appState.trainedModels = JSON.parse(raw);
  } catch(e) {}
}

function syncLoraModelsFromServer() {
  return fetch(jimengBaseUrl() + '/lora/list', { method: 'GET', signal: AbortSignal.timeout(4000) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.models) return;
      data.models.forEach(function(sm) {
        var exists = appState.trainedModels.some(function(m) { return m.folder === sm.folder || m.name === sm.name; });
        if (!exists) {
          appState.trainedModels.push({
            name: sm.name,
            folder: sm.folder,
            time: sm.time || '',
            files: sm.files || (sm.images ? sm.images.length : 0),
            steps: sm.steps || 1000,
            trigger: sm.trigger || '',
            images: sm.images || [],
            samplePreviews: []
          });
        }
      });
      persistLoraModels();
      renderLoraModelList();
    })
    .catch(function() {});
}

function saveLoraModelToServer(modelName, trigger, steps) {
  var payload = {
    name: modelName,
    trigger: trigger,
    steps: steps,
    time: new Date().toLocaleString('zh-CN'),
    images: appState.loraFiles.map(function(f) { return { name: f.name, data: f.data }; })
  };
  return fetch(jimengBaseUrl() + '/lora/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) {
    if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'save failed'); });
    return r.json();
  });
}
"""

REPLACEMENTS = [
    (
        'id="jimengAccessKey" placeholder="即梦 Access Key ID"',
        f'id="jimengAccessKey" value="{DEFAULT_AK}" placeholder="即梦 Access Key ID"',
    ),
    (
        'id="jimengSecretKey" placeholder="即梦 Secret Access Key"',
        f'id="jimengSecretKey" value="{DEFAULT_SK}" placeholder="即梦 Secret Access Key"',
    ),
    (
        "  jimeng:{url:'http://127.0.0.1:18901', connected:false, accessKey:'', secretKey:''},",
        f"  jimeng:{{url:'http://127.0.0.1:18901', connected:false, accessKey:'{DEFAULT_AK}', secretKey:'{DEFAULT_SK}'}},\n  styleRefs:{{}},",
    ),
    (
        "function buildBuddyCloudPrompt(frame, style, loraModel) {\n  var parts = [];\n  var stylePrefix = {",
        "function buildBuddyCloudPrompt(frame, style, loraModel) {\n  return buildFramePrompt(frame, style, loraModel);\n}\n\nfunction _legacyBuildBuddyCloudPrompt(frame, style, loraModel) {\n  var parts = [];\n  var stylePrefix = {",
    ),
    (
        """function generateViaJimeng(frame, style, loraModel) {
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
}""",
        """function generateViaJimeng(frame, style, loraModel) {
  var url = jimengBaseUrl();
  var prompt = buildFramePrompt(frame, style, loraModel);
  var sizeMap = { sketch: [768,480], render: [1024,640], anime: [768,768], street: [768,768], lora: [768,480] };
  var size = sizeMap[style.type] || [1024,640];

  return getStyleReferenceImage(style, frame.id, loraModel).then(function(refImage) {
    var payload = { prompt: prompt, width: size[0], height: size[1], strength: STYLE_REF_STRENGTH };
    if (refImage) payload.reference_image = refImage;
    if (appState.jimeng.accessKey) payload.access_key = appState.jimeng.accessKey;
    if (appState.jimeng.secretKey) payload.secret_key = appState.jimeng.secretKey;
    return fetch(url + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(err) { throw new Error(err.error || 'HTTP ' + r.status); });
      return r.json();
    })
    .then(function(data) {
      if (data.status === 'success' && data.data_url) return data.data_url;
      throw new Error(data.error || 'No image returned');
    });
  });
}""",
    ),
    (
        """function generateViaBuddyCloud(frame, style, loraModel) {
  var url = document.getElementById('buddyCloudUrl').value.replace(/\\/+$/, '');
  var prompt = buildBuddyCloudPrompt(frame, style, loraModel);""",
        """function generateViaBuddyCloud(frame, style, loraModel) {
  var url = document.getElementById('buddyCloudUrl').value.replace(/\\/+$/, '');
  var prompt = buildFramePrompt(frame, style, loraModel);""",
    ),
    (
        """function buildSdPrompt(frame, style, loraModel) {
  var parts = [];
  // Style prefix
  var stylePrefix = {""",
        """function buildSdPrompt(frame, style, loraModel) {
  return buildFramePrompt(frame, style, loraModel);
}

function _legacyBuildSdPrompt(frame, style, loraModel) {
  var parts = [];
  // Style prefix
  var stylePrefix = {""",
    ),
    (
        """      // Add to trained models
      appState.trainedModels.push({
        name: modelName,
        time: new Date().toLocaleString('zh-CN'),
        files: appState.loraFiles.length,
        steps: steps,
        trigger: document.getElementById('loraTrigger').value || 'sks',
        rank: document.getElementById('loraRank').value,
        lr: document.getElementById('loraLR').value,
        samplePreviews: appState.loraFiles.slice(0, 3).map(function(f) { return f.data; })
      });
      renderLoraModelList();""",
        """      var trigger = document.getElementById('loraTrigger').value || 'sks';
      var previews = appState.loraFiles.slice(0, 3).map(function(f) { return f.data; });
      saveLoraModelToServer(modelName, trigger, steps)
        .then(function(res) {
          var meta = (res && res.model) || {};
          appState.trainedModels.push({
            name: meta.name || modelName,
            folder: meta.name || modelName,
            time: meta.time || new Date().toLocaleString('zh-CN'),
            files: meta.files || appState.loraFiles.length,
            steps: meta.steps || steps,
            trigger: meta.trigger || trigger,
            rank: document.getElementById('loraRank').value,
            lr: document.getElementById('loraLR').value,
            images: meta.images || [],
            samplePreviews: previews
          });
          persistLoraModels();
          renderLoraModelList();
        })
        .catch(function(err) {
          console.warn('LoRA save to server failed, keeping local only:', err);
          appState.trainedModels.push({
            name: modelName,
            folder: modelName,
            time: new Date().toLocaleString('zh-CN'),
            files: appState.loraFiles.length,
            steps: steps,
            trigger: trigger,
            rank: document.getElementById('loraRank').value,
            lr: document.getElementById('loraLR').value,
            samplePreviews: previews
          });
          persistLoraModels();
          renderLoraModelList();
        });""",
    ),
    (
        "loadPersistedHistory();\nrenderSkillFloatBar();",
        "loadPersistedHistory();\nloadPersistedLoraModels();\nrenderSkillFloatBar();",
    ),
    (
        """// Auto-detect Jimeng proxy on load
(function() {
  var url = document.getElementById('jimengUrl');
  if (!url) return;
  var statusEl = document.getElementById('jimengStatus');
  var akInput = document.getElementById('jimengAccessKey');
  var skInput = document.getElementById('jimengSecretKey');
  try {
    var savedAk = localStorage.getItem('jimeng_ak');
    var savedSk = localStorage.getItem('jimeng_sk');
    if (savedAk && akInput) akInput.value = savedAk;
    if (savedSk && skInput) skInput.value = savedSk;
  } catch(e) {}

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
})();""",
        """// Auto-detect Jimeng proxy on load
(function() {
  var url = document.getElementById('jimengUrl');
  if (!url) return;
  var statusEl = document.getElementById('jimengStatus');
  var akInput = document.getElementById('jimengAccessKey');
  var skInput = document.getElementById('jimengSecretKey');
  try {
    var savedAk = localStorage.getItem('jimeng_ak');
    var savedSk = localStorage.getItem('jimeng_sk');
    if (savedAk && akInput) akInput.value = savedAk;
    if (savedSk && skInput) skInput.value = savedSk;
  } catch(e) {}
  if (akInput && akInput.value) appState.jimeng.accessKey = akInput.value.trim();
  if (skInput && skInput.value) appState.jimeng.secretKey = skInput.value.trim();

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
        return loadStyleRefs();
      }
    })
    .then(function() { return syncLoraModelsFromServer(); })
    .catch(function() {});
})();""",
    ),
]


def patch():
    content = HTML.read_text(encoding="utf-8")
    if "function buildFramePrompt" not in content:
        content = content.replace(
            "// ══════════════════════════════════════════════\n//  JIMENG (即梦) IMAGE GENERATION",
            HELPER_JS + "\n// ══════════════════════════════════════════════\n//  JIMENG (即梦) IMAGE GENERATION",
        )
        print("✓ Helper JS inserted")
    for old, new in REPLACEMENTS:
        if old in content:
            content = content.replace(old, new)
            print(f"✓ patched block ({old[:40]}...)")
        else:
            print(f"· skip (not found): {old[:50]}...")
    HTML.write_text(content, encoding="utf-8")
    print("Done.")


if __name__ == "__main__":
    patch()
