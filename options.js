// H2R - Translate :: options/settings page logic.

const DEFAULT_MODELS = {
  gemini: "gemini-3.5-flash",
  openai: "gpt-4o-mini",
  claude: "claude-3-5-haiku-latest",
};

const PROVIDER_HINTS = {
  gemini:
    'Create a free key at Google AI Studio (aistudio.google.com). Default model: "gemini-3.5-flash".',
  openai:
    'Create a key at platform.openai.com → API keys. Default model: "gpt-4o-mini".',
  claude:
    'Create a key at console.anthropic.com → API keys. Default model: "claude-3-5-haiku-latest".',
};

const form = document.getElementById("settings-form");
const providerEl = document.getElementById("provider");
const apiKeyEl = document.getElementById("apiKey");
const modelEl = document.getElementById("model");
const providerHint = document.getElementById("provider-hint");
const statusEl = document.getElementById("status");
const toggleKeyBtn = document.getElementById("toggle-key");
const testBtn = document.getElementById("test");

function setStatus(message, kind) {
  statusEl.textContent = message || "";
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function refreshProviderHint() {
  const p = providerEl.value;
  providerHint.textContent = PROVIDER_HINTS[p] || "";
  modelEl.placeholder = DEFAULT_MODELS[p] || "";
}

function load() {
  chrome.storage.sync.get(
    { provider: "gemini", apiKey: "", model: "" },
    (items) => {
      providerEl.value = items.provider || "gemini";
      apiKeyEl.value = items.apiKey || "";
      modelEl.value = items.model || "";
      refreshProviderHint();
    }
  );
}

providerEl.addEventListener("change", refreshProviderHint);

toggleKeyBtn.addEventListener("click", () => {
  if (apiKeyEl.type === "password") {
    apiKeyEl.type = "text";
    toggleKeyBtn.textContent = "Hide";
  } else {
    apiKeyEl.type = "password";
    toggleKeyBtn.textContent = "Show";
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    provider: providerEl.value,
    apiKey: apiKeyEl.value.trim(),
    model: modelEl.value.trim(),
  };
  chrome.storage.sync.set(data, () => {
    setStatus("Saved!", "ok");
    setTimeout(() => setStatus(""), 2500);
  });
});

testBtn.addEventListener("click", async () => {
  const provider = providerEl.value;
  const apiKey = apiKeyEl.value.trim();
  const model = modelEl.value.trim() || DEFAULT_MODELS[provider];
  if (!apiKey) {
    setStatus("Enter an API key first.", "err");
    return;
  }
  setStatus("Testing…", "busy");
  try {
    const text = await runTest(provider, apiKey, model);
    if (text) {
      setStatus("Connection OK ✓ (" + text.slice(0, 24) + ")", "ok");
    } else {
      setStatus("Connected, but no text returned.", "err");
    }
  } catch (err) {
    setStatus((err && err.message) || "Test failed.", "err");
  }
});

async function runTest(provider, apiKey, model) {
  const prompt = 'Translate the English word "hello" to Bengali. Reply with only the Bengali word.';

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await parseRes(res, "Gemini");
    return (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await parseRes(res, "OpenAI");
    return data?.choices?.[0]?.message?.content || "";
  }

  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 64,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await parseRes(res, "Claude");
    return (data?.content || []).map((c) => c.text || "").join("");
  }

  throw new Error("Unknown provider.");
}

async function parseRes(res, name) {
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`${name}: HTTP ${res.status}`);
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(`${name}: ${msg}`);
  }
  return data;
}

load();
