// H2R - Translate :: background service worker
// Creates context menus, calls the configured AI provider, and pushes the
// result down to the content script which renders it inside a tooltip.

const MENU_PARENT = "h2r-parent";
const MENU_TRANSLATE = "h2r-translate";
const MENU_LOOKUP = "h2r-lookup";

const DEFAULT_MODELS = {
  gemini: "gemini-2.5-flash-lite",
  openai: "gpt-5-nano",
  claude: "claude-3-5-haiku-latest",
};

function buildContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PARENT,
      title: "AI Translate (E2B)",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: MENU_TRANSLATE,
      parentId: MENU_PARENT,
      title: "Translate",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: MENU_LOOKUP,
      parentId: MENU_PARENT,
      title: "Lookup",
      contexts: ["selection"],
    });
  });
}

// Models that Google has retired; clear them so the current default is used.
const DEPRECATED_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

function migrateSettings() {
  chrome.storage.sync.get({ provider: "gemini", model: "" }, (items) => {
    const model = (items.model || "").trim();
    if (items.provider === "gemini" && DEPRECATED_GEMINI_MODELS.includes(model)) {
      // Reset to blank so getSettings() falls back to the current default model.
      chrome.storage.sync.set({ model: "" });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  buildContextMenus();
  migrateSettings();
});
chrome.runtime.onStartup.addListener(buildContextMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id == null) return;
  const text = (info.selectionText || "").trim();
  if (!text) return;

  const mode = info.menuItemId === MENU_LOOKUP ? "lookup" : "translate";
  handleRequest(tab.id, text, mode);
});

// Allow the content script (e.g. a re-try button) to ask for a translation too.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;
  if (message.type === "h2r-request" && sender.tab && sender.tab.id != null) {
    handleRequest(sender.tab.id, message.text, message.mode || "translate");
  } else if (message.type === "h2r-open-options") {
    chrome.runtime.openOptionsPage();
  }
  return false;
});

async function handleRequest(tabId, text, mode) {
  // Make sure the tooltip code is present in this tab. Tabs that were already
  // open when the extension was installed/reloaded won't have the content
  // script, so inject it on demand before sending any messages.
  await ensureContentScript(tabId);

  sendToTab(tabId, { type: "h2r-loading", text, mode });

  try {
    const settings = await getSettings();
    if (!settings.apiKey) {
      sendToTab(tabId, {
        type: "h2r-error",
        text,
        mode,
        error: "No API key configured. Open the AI Translate settings to add one.",
        needsSettings: true,
      });
      return;
    }

    const result = await translateWithAI(text, mode, settings);
    sendToTab(tabId, { type: "h2r-result", text, mode, result });
  } catch (err) {
    sendToTab(tabId, {
      type: "h2r-error",
      text,
      mode,
      error: (err && err.message) || String(err),
    });
  }
}

function sendToTab(tabId, payload) {
  chrome.tabs.sendMessage(tabId, payload).catch(() => {
    // Content script may not be injected on this page (e.g. chrome:// pages).
  });
}

async function ensureContentScript(tabId) {
  // If the content script is already running it will answer a ping.
  try {
    await chrome.tabs.sendMessage(tabId, { type: "h2r-ping" });
    return true;
  } catch (e) {
    // Not injected yet — fall through and inject it.
  }
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return true;
  } catch (e) {
    // Restricted page (chrome://, Web Store, PDF viewer, etc.) — cannot inject.
    return false;
  }
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { provider: "gemini", apiKey: "", model: "" },
      (items) => {
        const provider = items.provider || "gemini";
        resolve({
          provider,
          apiKey: (items.apiKey || "").trim(),
          model: (items.model || "").trim() || DEFAULT_MODELS[provider],
        });
      }
    );
  });
}

function buildPrompt(text, mode) {
  const intro =
    mode === "lookup"
      ? `You are an English-to-Bengali dictionary and language tutor. The user looked up the following English word or phrase:`
      : `You are an expert English-to-Bengali translator and language tutor. Translate the following English text to Bengali:`;

  return `${intro}

"""${text}"""

Respond ONLY with a single minified JSON object (no markdown, no code fences) using exactly this shape:
{
  "bengali": "the natural Bengali translation",
  "transliteration": "romanized/phonetic Bengali pronunciation",
  "english_meaning": "a concise explanation of the meaning in English",
  "part_of_speech": "the part of speech if it is a single word, otherwise an empty string",
  "examples": [
    { "english": "an English example sentence", "bengali": "its Bengali translation" },
    { "english": "another English example sentence", "bengali": "its Bengali translation" }
  ]
}

Provide 2 to 3 examples. Keep the JSON valid and do not add any extra keys or text.`;
}

async function translateWithAI(text, mode, settings) {
  const prompt = buildPrompt(text, mode);
  let raw;

  if (settings.provider === "gemini") {
    raw = await callGemini(prompt, settings);
  } else if (settings.provider === "openai") {
    raw = await callOpenAI(prompt, settings);
  } else if (settings.provider === "claude") {
    raw = await callClaude(prompt, settings);
  } else {
    throw new Error(`Unknown provider: ${settings.provider}`);
  }

  return parseModelJson(raw, text);
}

function parseModelJson(raw, fallbackText) {
  if (!raw) {
    throw new Error("The AI returned an empty response.");
  }
  let cleaned = raw.trim();
  // Strip markdown code fences if the model added them anyway.
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  // Grab the first balanced-looking JSON object.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      bengali: parsed.bengali || "",
      transliteration: parsed.transliteration || "",
      english_meaning: parsed.english_meaning || "",
      part_of_speech: parsed.part_of_speech || "",
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
    };
  } catch (e) {
    // If parsing fails, show whatever text we got so the user is not stuck.
    return {
      bengali: raw.trim(),
      transliteration: "",
      english_meaning: "",
      part_of_speech: "",
      examples: [],
    };
  }
}

async function callGemini(prompt, settings) {
  const model = settings.model || DEFAULT_MODELS.gemini;
  // Send the key both ways (query param + header) for maximum compatibility
  // across key types and endpoint versions.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    // Gemini 3.x recommends keeping temperature at its default; only request a
    // JSON response so parsing stays reliable.
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": settings.apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await readJsonOrThrow(res, "Gemini");
  const parts = data?.candidates?.[0]?.content?.parts;
  const textOut = Array.isArray(parts) ? parts.map((p) => p.text || "").join("") : "";
  if (!textOut) throw new Error("Gemini returned no text. Check your API key and model name.");
  return textOut;
}

async function callOpenAI(prompt, settings) {
  const model = settings.model || DEFAULT_MODELS.openai;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a helpful English-to-Bengali translation assistant that always replies with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await readJsonOrThrow(res, "OpenAI");
  const textOut = data?.choices?.[0]?.message?.content || "";
  if (!textOut) throw new Error("OpenAI returned no text. Check your API key and model name.");
  return textOut;
}

async function callClaude(prompt, settings) {
  const model = settings.model || DEFAULT_MODELS.claude;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await readJsonOrThrow(res, "Claude");
  const textOut = Array.isArray(data?.content)
    ? data.content.map((c) => c.text || "").join("")
    : "";
  if (!textOut) throw new Error("Claude returned no text. Check your API key and model name.");
  return textOut;
}

// Pull the structured machine reason (e.g. ACCESS_TOKEN_TYPE_UNSUPPORTED) out of
// a Google API error payload so we can give a precise hint.
function extractErrorReason(data) {
  const details = data?.error?.details;
  if (Array.isArray(details)) {
    for (const d of details) {
      if (d && d.reason) return d.reason;
    }
  }
  return data?.error?.status || "";
}

async function readJsonOrThrow(res, providerName) {
  let data;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) {
      throw new Error(`${providerName} request failed (HTTP ${res.status}).`);
    }
    throw new Error(`${providerName} returned an invalid response.`);
  }
  if (!res.ok) {
    const apiMsg =
      data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`;
    const reason = extractErrorReason(data);
    let hint = "";
    if (res.status === 401 || res.status === 403) {
      if (providerName === "Gemini") {
        if (reason === "ACCESS_TOKEN_TYPE_UNSUPPORTED") {
          hint =
            " — Google rejected this key (ACCESS_TOKEN_TYPE_UNSUPPORTED). New 'AQ.' auth keys only work when they are bound to a service account that has the Generative Language API enabled; this one is not. Fix: create a key on the AI Studio API keys page (https://aistudio.google.com/apikey) using a project where you have permission to create the linked service account, OR create a standard key in Google Cloud Console and restrict it to the 'Generative Language API'. Then update it in the H2R settings.";
        } else {
          hint =
            " — Make sure you pasted a Gemini API key from Google AI Studio (https://aistudio.google.com/apikey), not a Google Cloud OAuth client ID or a service-account credential. Also confirm the 'Generative Language API' is enabled and the key has no HTTP-referrer/IP restrictions.";
        }
      } else {
        hint = " — Check that the API key is correct and has not expired or been restricted.";
      }
    }
    throw new Error(`${providerName} error: ${apiMsg}${hint}`);
  }
  return data;
}
