# Publishing AI Translate - English to Bangla to the Chrome Web Store

> **Publisher / contact:** Robiul Islam Robi — hello2robi@gmail.com
> **Organization:** hello2robi.com
> Use this name, organization, and email for the developer account, the listing's
> support contact, and the privacy policy contact.


This guide walks through submitting the extension to the Chrome Web Store. The
code in this repo is already store-ready (Manifest V3, valid icons, a compliant
short description, and a privacy policy).

## 1. One-time setup

1. Create a Chrome Web Store **developer account** at
   <https://chrome.google.com/webstore/devconsole>.
2. Pay the **one-time US$5 registration fee** (required before you can publish).
3. Verify your account email and, if you want a custom publisher name, set it up
   in the developer console account settings.

## 2. Build the upload package

From the repo root, run:

```bash
./package.sh
```

This regenerates the icons and produces a clean ZIP at
`dist/ai-translate-english-to-bangla-v<version>.zip` containing only the runtime
files (no docs, git, or build scripts). Upload **this ZIP** to the store.

> Bump the `version` in `manifest.json` before every new upload — the store
> rejects a package whose version is not higher than the currently published one.

## 3. Prepare listing assets

The Web Store requires a few images. You provide:

- **Store icon:** 128×128 PNG. Already included (`icons/icon128.png`); the console
  may also ask you to upload it directly.
- **Screenshots:** at least **one**, 1280×800 or 640×400 PNG/JPEG. Capture the
  tooltip in action:
  1. Load the unpacked extension (see the README), add a working API key.
  2. Open a normal web page, select an English word/sentence, right-click →
     "AI Translate (E2B)".
  3. Screenshot the page with the tooltip visible. Crop/resize to 1280×800.
  4. Recommended: 2–4 screenshots (a word result, a sentence result, the settings
     page).
- **Optional promo images:** small tile 440×280; marquee 1400×560. Not required.

## 4. Fill in the store listing

In the developer console, create a new item, upload the ZIP, then complete:

- **Name:** `AI Translate - English to Bangla`
- **Summary / short description (≤132 chars):**
  `Translate English to Bengali with AI. Select text, right-click, and see the Bengali translation, meaning, and examples.`
- **Detailed description** (suggested):

  ```
  AI Translate - English to Bangla turns any web page into an English→Bangla learning tool.

  Select a word or sentence, right-click, and choose "AI Translate (E2B)".
  A tooltip instantly shows:
    • the Bengali translation (with phonetic transliteration),
    • the English meaning (and part of speech for single words), and
    • example sentences in both English and Bengali.

  Bring your own AI key — choose Google Gemini, OpenAI (ChatGPT), or Anthropic
  Claude in the settings. Gemini offers a free tier, so you can use the
  extension at no cost. Your API key is stored only in your browser and is sent
  directly to the provider you pick; there is no middle-man server.

  Features
    • One-click "AI Translate (E2B)" right-click menu on any selection
    • Clean, light/dark-aware tooltip with a Bengali font stack
    • Pluggable AI provider with a built-in "Test connection" button
    • No tracking, no analytics, no data collection
  ```

- **Category:** Productivity (or Education).
- **Language:** English.
- **Privacy policy URL:** required and must be publicly reachable. A ready-made
  HTML policy is at `docs/privacy.html`. Recommended hosting via **GitHub Pages**:
  1. Merge the policy to the `main` branch.
  2. In the GitHub repo: **Settings → Pages → Build and deployment → Source:
     "Deploy from a branch"**, branch **`main`**, folder **`/docs`**, then Save.
  3. After it builds, your privacy policy URL will be:
     `https://islamrobi.github.io/ai-translation/privacy.html`
  Paste that URL into the store listing.
  Alternative (no Pages): once `PRIVACY.md` is on `main`, you can link the rendered
  file at `https://github.com/islamrobi/ai-translation/blob/main/PRIVACY.md`.

## 5. Privacy & data-use disclosures (required)

In the console's **Privacy practices** tab:

- **Single purpose:** "Translate selected English text to Bengali and show the
  meaning and examples in a tooltip."
- **Permission justifications:**
  - `contextMenus` — add the "AI Translate (E2B)" right-click menu item.
  - `storage` — save the user's provider, API key, and model preference.
  - `scripting` — inject the tooltip UI into the active tab on demand.
  - `activeTab` — show the tooltip on the page where the user requests a
    translation, including tabs opened before install.
  - Host permissions (`generativelanguage.googleapis.com`, `api.openai.com`,
    `api.anthropic.com`) — send translation requests to the chosen AI provider.
- **Remote code:** "No, this extension does not use remote code." (All logic
  ships in the package; only data is exchanged with the provider APIs.)
- **Data usage:** Declare that the extension handles the user's API key and the
  text they select, that this data is sent only to the chosen AI provider, is not
  sold, and is not used for purposes unrelated to the single purpose.

## 6. Submit for review

1. Set **Visibility** (Public, Unlisted, or Private).
2. Choose distribution regions (worldwide is fine).
3. Click **Submit for review**. Review typically takes from a few hours up to a
   couple of weeks. You'll get email updates and can track status in the console.

## 7. Notes that affect review

- This extension does **not** request broad host permissions. The tooltip code
  is injected on demand with `chrome.scripting` using the `activeTab` permission,
  which is granted only when the user invokes the extension via the right-click
  menu. The only host permissions are the three specific AI provider API domains.
- Keep the published privacy policy URL live; a dead link can cause removal.
- For each future update: bump `manifest.json` `version`, run `./package.sh`,
  upload the new ZIP, and resubmit.
