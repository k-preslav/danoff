if (chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
}

const DEFAULT_VISION_MODELS = [
  "qwen/qwen3.8-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview"
];

const DEFAULT_TEXT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b"
];

let pendingSavePromise = null;

function applyUrlText(text) {
  if (!window.__danoff_active_text) {
    window.__danoff_original_url = window.location.href;
    window.__danoff_orig_base = window.location.pathname + window.location.search;
  }
  window.__danoff_active_text = text;

  if (!window.__danoff_listener_attached) {
    window.__danoff_listener_attached = true;
    const cleanUp = () => {
      if (window.__danoff_original_url) {
        try {
          history.replaceState(history.state, "", window.__danoff_original_url);
        } catch (e) {}
      }
      window.__danoff_active_text = null;
    };
    window.addEventListener('beforeunload', cleanUp, { capture: true });
    window.addEventListener('pagehide', cleanUp, { capture: true });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') cleanUp();
    }, { capture: true });
  }

  const base = window.__danoff_orig_base || (window.location.pathname + window.location.search);
  const target = text ? (base + '#' + text) : (window.__danoff_original_url || base);
  try {
    history.replaceState(history.state, "", target);
  } catch (err) {}
}

function restoreCleanUrl() {
  if (window.__danoff_original_url) {
    try {
      history.replaceState(history.state, "", window.__danoff_original_url);
    } catch (e) {}
  }
  window.__danoff_active_text = null;
}

function captureTab(windowId, retries = 1) {
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(windowId || null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        if (retries > 0) {
          setTimeout(() => {
            captureTab(windowId, retries - 1).then(resolve);
          }, 600);
          return;
        }
        console.log("Capture failed:", chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(dataUrl);
      }
    });
  });
}

function getSelectionText(tabId, autoGrabAll = false) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (grabAll) => {
        if (grabAll) {
          try {
            const raw = document.body ? (document.body.innerText || document.body.textContent || "") : "";
            const cleaned = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
            return cleaned.slice(0, 30000);
          } catch (e) {
            return "";
          }
        }

        const sel = window.getSelection().toString().trim();
        if (sel) {
          try {
            const el = document.createElement('textarea');
            el.value = sel;
            el.setAttribute('readonly', '');
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
          } catch (e) {}
        }
        return sel;
      },
      args: [autoGrabAll]
    }, (results) => {
      if (chrome.runtime.lastError || !results || !results[0]) {
        resolve("");
      } else {
        resolve(results[0].result || "");
      }
    });
  });
}

async function getApiKey() {
  const { api_key_val } = await chrome.storage.local.get('api_key_val');
  if (api_key_val && api_key_val.trim()) return api_key_val.trim();
  try {
    const res = await fetch('./.env');
    const txt = await res.text();
    const match = txt.match(/GROQ_API_KEY=(.*)/);
    if (match) return match[1].trim();
  } catch (e) {}
  return "";
}

async function fetchAvailableModels(apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": "Bearer " + apiKey }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !Array.isArray(json.data)) return null;

    const validIds = json.data
      .filter(m => m && m.id && m.active !== false)
      .map(m => m.id);

    const excluded = /whisper|guard|rerank|embed|tts|stt/i;
    const filtered = validIds.filter(id => !excluded.test(id));

    const visionPattern = /vision|scout|maverick|vl|qwen3\.[68]|multimodal|omni/i;
    const vision = filtered.filter(id => visionPattern.test(id));
    const text = filtered.filter(id => !visionPattern.test(id));

    const data = {
      all: filtered,
      vision: vision,
      text: text,
      timestamp: Date.now()
    };
    await chrome.storage.local.set({ cached_models: data });
    return data;
  } catch (e) {
    return null;
  }
}

async function getModels(apiKey, force = false) {
  if (!force) {
    const { cached_models } = await chrome.storage.local.get('cached_models');
    if (cached_models && (Date.now() - (cached_models.timestamp || 0) < 3600000 * 12)) {
      return cached_models;
    }
  }
  const fresh = await fetchAvailableModels(apiKey);
  if (fresh) return fresh;
  const { cached_models } = await chrome.storage.local.get('cached_models');
  return cached_models || null;
}

function buildCandidates(userChoice, workingModel, dynamicList, defaultList) {
  const result = [];
  const pushUnique = (id) => {
    if (id && typeof id === "string" && !result.includes(id)) {
      result.push(id);
    }
  };
  if (userChoice && userChoice !== "auto") pushUnique(userChoice);
  if (workingModel) pushUnique(workingModel);
  if (Array.isArray(dynamicList)) dynamicList.forEach(pushUnique);
  if (Array.isArray(defaultList)) defaultList.forEach(pushUnique);
  return result;
}

function isModelError(status, json) {
  if (status === 404 || status === 429) return true;
  const msg = json?.error?.message || "";
  const code = json?.error?.code || "";
  if (code === "model_not_found" || code === "model_decommissioned") return true;
  if (msg.includes("does not exist") || msg.includes("not have access") || msg.includes("decommissioned")) return true;
  if (msg.includes("is not supported") || msg.includes("model")) return true;
  return false;
}

async function requestCompletion(apiKey, model, messages) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });
    const json = await res.json();
    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    return { ok: false, status: 0, err: err.message };
  }
}

async function resolveAndExecute(apiKey, prompt, screenshot) {
  if (!apiKey) {
    return "API Error: No Groq API key set. Open settings to enter it.";
  }

  const {
    user_vision_model,
    user_text_model,
    working_vision_model,
    working_text_model
  } = await chrome.storage.local.get([
    'user_vision_model',
    'user_text_model',
    'working_vision_model',
    'working_text_model'
  ]);

  let modelData = await getModels(apiKey);
  let lastErrorMsg = "";

  if (screenshot) {
    const visionCandidates = buildCandidates(
      user_vision_model,
      working_vision_model,
      modelData?.vision,
      DEFAULT_VISION_MODELS
    );

    for (let i = 0; i < visionCandidates.length; i++) {
      const model = visionCandidates[i];
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: screenshot } }
          ]
        }
      ];

      const res = await requestCompletion(apiKey, model, messages);
      if (res.ok && res.data?.choices?.[0]?.message?.content) {
        await chrome.storage.local.set({ working_vision_model: model });
        return res.data.choices[0].message.content;
      }

      if (res.status === 401) {
        return "API Error: Invalid Groq API key.";
      }

      lastErrorMsg = res.data?.error?.message || res.err || "Vision request failed";

      if (isModelError(res.status, res.data)) {
        if (i === 0 && (!modelData || Date.now() - (modelData.timestamp || 0) > 60000)) {
          modelData = await getModels(apiKey, true);
        }
        continue;
      }
    }
  }

  const textCandidates = buildCandidates(
    user_text_model,
    working_text_model,
    modelData?.text,
    DEFAULT_TEXT_MODELS
  );

  for (let i = 0; i < textCandidates.length; i++) {
    const model = textCandidates[i];
    const messages = [{ role: "user", content: prompt }];

    const res = await requestCompletion(apiKey, model, messages);
    if (res.ok && res.data?.choices?.[0]?.message?.content) {
      await chrome.storage.local.set({ working_text_model: model });
      return res.data.choices[0].message.content;
    }

    if (res.status === 401) {
      return "API Error: Invalid Groq API key.";
    }

    lastErrorMsg = res.data?.error?.message || res.err || "Text request failed";

    if (isModelError(res.status, res.data)) {
      if (i === 0 && (!modelData || Date.now() - (modelData.timestamp || 0) > 60000)) {
        modelData = await getModels(apiKey, true);
      }
      continue;
    }
  }

  return "API Error: " + (lastErrorMsg || "Could not complete request.");
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "refresh-models") {
    getApiKey().then(k => fetchAvailableModels(k)).then(data => {
      sendResponse(data);
    });
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  var { userid } = await chrome.storage.local.get('userid');
  if (!userid) {
    userid = 'u' + Math.random().toString(36).substr(2, 9);
    await chrome.storage.local.set({ userid: userid });
  }

  console.log("Background:", command);

  if (command === "change-url") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;
      const tab = tabs[0];

      if (pendingSavePromise) {
        await pendingSavePromise;
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: applyUrlText,
        args: ["Please·Wait"]
      });

      const { savedSelection } = await chrome.storage.local.get('savedSelection');
      var { custom_prmpt } = await chrome.storage.local.get('custom_prmpt');
      const { savedScreenshot } = await chrome.storage.local.get('savedScreenshot');

      var base_txt = "Act as a specialized assistant. Follow instructions precisely and provide concise, accurate answers. Constraint: Every line of your output must contain a maximum of 8 words. If a sentence is longer, you must use a line break. Language: Respond in the same language as the provided instructions (Default: English).";

      if (custom_prmpt) {
        base_txt += " " + custom_prmpt;
      }

      var final_prmpt = base_txt;
      if (savedSelection && savedSelection.trim()) {
        final_prmpt += " " + savedSelection.trim();
      } else if (savedScreenshot) {
        final_prmpt += " Solve the question in the screenshot.";
      }

      const api_k = await getApiKey();

      try {
        var got_txt = await resolveAndExecute(api_k, final_prmpt, savedScreenshot);

        var lines_arr = got_txt.split('\n').map(l => l.trim().replace(/\s+/g, '·')).filter(Boolean);
        if (lines_arr.length === 0) lines_arr = ["Done"];

        var curr_l = 1;
        const lineText = `[${curr_l}/${lines_arr.length}]··${lines_arr[0]}`;

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: applyUrlText,
          args: [lineText]
        });

        chrome.storage.local.set({
          responseData: { responseLines: lines_arr, currentLine: curr_l }
        });
      } catch (e) {
        console.log("err:: " + e);
      }
    });

  } else if (command === "save-selected-text") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;
      const tab = tabs[0];

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: applyUrlText,
        args: ["Wait"]
      });

      pendingSavePromise = (async () => {
        await chrome.storage.local.remove(['savedScreenshot', 'savedSelection']);

        const { screenshot_enabled, autotext_enabled } = await chrome.storage.local.get(['screenshot_enabled', 'autotext_enabled']);
        const [screenshotData, selectionText] = await Promise.all([
          screenshot_enabled ? captureTab(tab.windowId) : Promise.resolve(null),
          getSelectionText(tab.id, !!autotext_enabled)
        ]);

        await chrome.storage.local.set({
          savedScreenshot: screenshotData || null,
          savedSelection: selectionText || ""
        });
      })();

      await pendingSavePromise;
      pendingSavePromise = null;

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: applyUrlText,
        args: ["Ready"]
      });

      setTimeout(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
          if (currentTabs[0] && currentTabs[0].id === tab.id) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                if (window.__danoff_active_text === "Ready") {
                  if (window.__danoff_original_url) {
                    try {
                      history.replaceState(history.state, "", window.__danoff_original_url);
                    } catch (e) {}
                  }
                  window.__danoff_active_text = null;
                }
              }
            });
          }
        });
      }, 1500);
    });

  } else if (command === "next-line" || command === "previous-line") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      const { responseData } = await chrome.storage.local.get('responseData');
      if (!responseData) return;

      let { responseLines, currentLine } = responseData;

      if (command === "next-line") {
        currentLine = Math.max(currentLine - 1, 1);
      } else {
        currentLine = Math.min(currentLine + 1, responseLines.length);
      }

      const lineText = `[${currentLine}/${responseLines.length}]··${responseLines[currentLine - 1]}`;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: applyUrlText,
        args: [lineText]
      });

      chrome.storage.local.set({
        responseData: { responseLines, currentLine }
      });
    });
  } else if (command === "clear-url") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: restoreCleanUrl
      });

      chrome.storage.local.remove('responseData');
    });
  }
});