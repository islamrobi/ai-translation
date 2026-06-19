// H2R - Translate :: content script
// Renders translation results inside a floating tooltip anchored to the user's
// current text selection (or the viewport center as a fallback).

(function () {
  if (window.__h2rTranslateInjected) return;
  window.__h2rTranslateInjected = true;

  let tooltipEl = null;

  function getAnchorRect() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect && (rect.width || rect.height)) {
        return rect;
      }
    }
    return null;
  }

  function ensureTooltip() {
    if (tooltipEl && document.body.contains(tooltipEl)) return tooltipEl;

    tooltipEl = document.createElement("div");
    tooltipEl.className = "h2r-tooltip";
    tooltipEl.setAttribute("dir", "auto");
    tooltipEl.addEventListener("mousedown", (e) => e.stopPropagation());
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function positionTooltip(tip) {
    const rect = getAnchorRect();
    const margin = 8;
    tip.style.visibility = "hidden";
    tip.style.display = "block";
    tip.style.left = "0px";
    tip.style.top = "0px";

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    let left;
    let top;

    if (rect) {
      left = rect.left + rect.width / 2 - tw / 2;
      top = rect.bottom + margin;
      // Flip above the selection if there is no room below.
      if (top + th > vh - margin) {
        top = rect.top - th - margin;
      }
    } else {
      left = vw / 2 - tw / 2;
      top = vh / 2 - th / 2;
    }

    left = Math.max(margin, Math.min(left, vw - tw - margin));
    top = Math.max(margin, Math.min(top, vh - th - margin));

    // Convert from viewport coords to document coords (position: absolute).
    tip.style.left = `${left + window.scrollX}px`;
    tip.style.top = `${top + window.scrollY}px`;
    tip.style.visibility = "visible";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function headerHtml(modeLabel) {
    return `
      <div class="h2r-header">
        <span class="h2r-brand">H2R · ${escapeHtml(modeLabel)}</span>
        <button class="h2r-close" type="button" aria-label="Close">×</button>
      </div>`;
  }

  function render(html) {
    const tip = ensureTooltip();
    tip.innerHTML = html;
    const closeBtn = tip.querySelector(".h2r-close");
    if (closeBtn) closeBtn.addEventListener("click", hideTooltip);
    positionTooltip(tip);
  }

  function showLoading(sourceText, mode) {
    const label = mode === "lookup" ? "Lookup" : "Translate";
    render(`
      ${headerHtml(label)}
      <div class="h2r-body">
        <div class="h2r-source">${escapeHtml(sourceText)}</div>
        <div class="h2r-loading">
          <span class="h2r-spinner"></span>
          <span>Translating to Bengali…</span>
        </div>
      </div>`);
  }

  function showError(sourceText, mode, errorMsg, needsSettings) {
    const label = mode === "lookup" ? "Lookup" : "Translate";
    const settingsBtn = needsSettings
      ? `<button class="h2r-settings-btn" type="button">Open settings</button>`
      : `<button class="h2r-retry-btn" type="button" data-text="${escapeHtml(
          sourceText
        )}" data-mode="${escapeHtml(mode)}">Retry</button>`;

    render(`
      ${headerHtml(label)}
      <div class="h2r-body">
        <div class="h2r-source">${escapeHtml(sourceText)}</div>
        <div class="h2r-error">${escapeHtml(errorMsg)}</div>
        <div class="h2r-actions">${settingsBtn}</div>
      </div>`);

    const tip = ensureTooltip();
    const sBtn = tip.querySelector(".h2r-settings-btn");
    if (sBtn) {
      sBtn.addEventListener("click", () => {
        // openOptionsPage is not available in content scripts, so ask the
        // background service worker to open the settings page.
        chrome.runtime.sendMessage({ type: "h2r-open-options" }).catch(() => {});
      });
    }
    const rBtn = tip.querySelector(".h2r-retry-btn");
    if (rBtn) {
      rBtn.addEventListener("click", () => {
        chrome.runtime
          .sendMessage({ type: "h2r-request", text: sourceText, mode })
          .catch(() => {});
      });
    }
  }

  function showResult(sourceText, mode, result) {
    const label = mode === "lookup" ? "Lookup" : "Translate";
    const pos = result.part_of_speech
      ? `<span class="h2r-pos">${escapeHtml(result.part_of_speech)}</span>`
      : "";
    const translit = result.transliteration
      ? `<div class="h2r-translit">${escapeHtml(result.transliteration)}</div>`
      : "";

    let examplesHtml = "";
    if (Array.isArray(result.examples) && result.examples.length) {
      const items = result.examples
        .map(
          (ex) => `
          <li class="h2r-example">
            <div class="h2r-ex-en">${escapeHtml(ex.english || "")}</div>
            <div class="h2r-ex-bn">${escapeHtml(ex.bengali || "")}</div>
          </li>`
        )
        .join("");
      examplesHtml = `
        <div class="h2r-section">
          <div class="h2r-section-title">Examples</div>
          <ul class="h2r-examples">${items}</ul>
        </div>`;
    }

    const meaningHtml = result.english_meaning
      ? `
        <div class="h2r-section">
          <div class="h2r-section-title">English meaning ${pos}</div>
          <div class="h2r-meaning">${escapeHtml(result.english_meaning)}</div>
        </div>`
      : "";

    render(`
      ${headerHtml(label)}
      <div class="h2r-body">
        <div class="h2r-source">${escapeHtml(sourceText)}</div>
        <div class="h2r-section h2r-primary">
          <div class="h2r-section-title">Bengali</div>
          <div class="h2r-bengali">${escapeHtml(result.bengali) || "—"}</div>
          ${translit}
        </div>
        ${meaningHtml}
        ${examplesHtml}
      </div>`);
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.style.display = "none";
      tooltipEl.innerHTML = "";
    }
  }

  // Dismiss the tooltip on outside click or Escape.
  document.addEventListener(
    "mousedown",
    (e) => {
      if (tooltipEl && tooltipEl.style.display !== "none") {
        if (!tooltipEl.contains(e.target)) hideTooltip();
      }
    },
    true
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideTooltip();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;
    switch (message.type) {
      case "h2r-ping":
        sendResponse({ ok: true });
        return;
      case "h2r-loading":
        showLoading(message.text, message.mode);
        break;
      case "h2r-result":
        showResult(message.text, message.mode, message.result);
        break;
      case "h2r-error":
        showError(message.text, message.mode, message.error, message.needsSettings);
        break;
    }
  });
})();
