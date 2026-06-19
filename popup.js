// H2R - Translate :: toolbar popup.

const statusEl = document.getElementById("status");

chrome.storage.sync.get({ provider: "gemini", apiKey: "" }, (items) => {
  if (items.apiKey && items.apiKey.trim()) {
    const name =
      { gemini: "Google Gemini", openai: "OpenAI (ChatGPT)", claude: "Anthropic Claude" }[
        items.provider
      ] || items.provider;
    statusEl.textContent = "Ready · using " + name;
    statusEl.className = "ok";
  } else {
    statusEl.textContent = "No API key set. Add one in settings to start translating.";
    statusEl.className = "warn";
  }
});

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
