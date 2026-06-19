# AI Translate - English to Bangla

A Chrome (Manifest V3) extension that translates **English → Bengali (Bangla)** using an AI
model of your choice (Google Gemini, OpenAI / ChatGPT, or Anthropic Claude).

Select any word or sentence on a web page, right-click, and pick **“H2R - Translate”**
or **“H2R - Lookup”**. A tooltip appears showing:

1. **Bengali** translation first (with phonetic transliteration), then
2. **English meaning** (and part of speech for single words), then
3. **Example usage** sentences in both English and Bengali.

## Features

- Right-click context menu **“H2R - Translate”** and **“H2R - Lookup”** on any text selection.
- Results render inline in a clean tooltip anchored to the selection (no page navigation).
- Pluggable AI provider — Gemini, ChatGPT (OpenAI), or Claude (Anthropic).
- API key and provider configured in the extension settings after install.
- Light/dark mode aware tooltip, with a built-in Bengali font stack.
- "Test connection" button in settings to verify your key/model quickly.

## Install (load unpacked)

1. Clone or download this repository.
2. (Optional) Regenerate icons: `python3 gen_icons.py` (icons are already committed).
3. Open `chrome://extensions` in Chrome (or any Chromium browser).
4. Toggle **Developer mode** on (top-right).
5. Click **Load unpacked** and select this project folder.
6. The **H2R - Translate** icon appears in the toolbar.

## Configure your API key

1. Click the **H2R - Translate** toolbar icon → **Open settings** (or right-click the
   icon → Options).
2. Choose your **AI provider**.
3. Paste your **API key**:
   - **Gemini** — create a free key at [Google AI Studio](https://aistudio.google.com/).
   - **OpenAI** — create a key at [platform.openai.com](https://platform.openai.com/api-keys).
   - **Claude** — create a key at [console.anthropic.com](https://console.anthropic.com/).
4. (Optional) Set a specific **model**. Leave blank to use the recommended default:
   | Provider | Default model |
   | --- | --- |
   | Gemini | `gemini-2.5-flash-lite` (cheapest; free tier available) |
   | OpenAI | `gpt-5-nano` (cheapest; no free tier) |
   | Claude | `claude-3-5-haiku-latest` |
5. Click **Save settings**. Use **Test connection** to confirm it works.

## Usage

1. Highlight an English word or sentence on any page.
2. Right-click → **H2R - Translate** (full translation) or **H2R - Lookup** (dictionary-style).
3. Read the Bengali translation, English meaning, and examples in the tooltip.
4. Press **Esc** or click outside the tooltip to dismiss it.

## Privacy

Your API key is stored only in your browser via `chrome.storage.sync` and is sent
**directly** from your browser to the AI provider you selected. The extension has no
backend server and shares nothing with any third party.

## Project structure

```
manifest.json     Extension manifest (MV3)
background.js     Service worker: context menus + AI provider API calls
content.js        Injects and renders the tooltip on the page
content.css       Tooltip styling (light/dark)
options.html/.css/.js   Settings page (provider, API key, model, test)
popup.html/.js    Toolbar popup with status + settings shortcut
icons/            Generated PNG icons (16/32/48/128)
gen_icons.py      Stdlib-only icon generator
```

## Troubleshooting

### Gemini: "Request had invalid authentication credentials … Expected OAuth 2 access token" (HTTP 401)

This is returned by Google, not the extension, and means the API key was rejected.
The structured reason is usually `ACCESS_TOKEN_TYPE_UNSUPPORTED`.

Google now issues **auth keys** (they start with `AQ.`) instead of the legacy
standard keys (`AIza…`). An `AQ.` key only works when it is **bound to a Google
Cloud service account that has the Generative Language API enabled**. If that
binding did not complete (often due to missing IAM permissions when the key was
created), the key is issued but every request fails with the error above.

To fix it, create a working key one of these ways:

1. **AI Studio (recommended):** go to <https://aistudio.google.com/apikey> and
   create a key in a project where you have permission to create the linked
   service account. Then test it (see below).
2. **Google Cloud Console (legacy standard key):** create an API key, then
   restrict it to the **Generative Language API**. Restricted standard keys
   continue to work.

Verify any key from a terminal before pasting it into the extension:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent" \
  -H "x-goog-api-key: YOUR_KEY" -H "Content-Type: application/json" \
  -X POST -d '{"contents":[{"parts":[{"text":"translate hello to bengali"}]}]}'
```

A working key returns a JSON response with `candidates`; a broken key returns the
401 `UNAUTHENTICATED` error.

## Publishing to the Chrome Web Store

Run `./package.sh` to build a clean upload ZIP at
`dist/ai-translate-english-to-bangla-v<version>.zip`, then follow
[`PUBLISHING.md`](PUBLISHING.md) for the full submission steps. The
extension's privacy policy is in [`PRIVACY.md`](PRIVACY.md) (host it publicly and
provide the URL in the store listing).

## Notes

- Claude requests are sent with the `anthropic-dangerous-direct-browser-access` header,
  which Anthropic requires for direct browser (CORS) calls.
- The extension requests host permissions only for the three provider API domains.
