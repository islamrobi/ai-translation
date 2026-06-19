# Privacy Policy — AI Translate - English to Bangla

_Last updated: June 19, 2026_

AI Translate - English to Bangla ("the extension") is a browser extension that translates English
text to Bengali using an AI provider that you choose and configure with your own
API key. This policy explains what data the extension handles and how.

## Summary

- The extension has **no backend server** and the developer collects **no data**.
- Your **API key** is stored locally in your browser and never sent to the
  developer or any third party other than the AI provider you select.
- The **text you choose to translate** is sent only to that AI provider, only
  when you explicitly trigger a translation or lookup.

## What data is processed

1. **API key.** You enter an API key for your chosen provider (Google Gemini,
   OpenAI, or Anthropic) in the extension's settings. It is saved using the
   browser's extension storage (`chrome.storage.sync`) so it persists across
   sessions and, if you are signed in to the browser, syncs to your own account.
   It is used solely to authenticate your requests to that provider.

2. **Selected text.** When you select text and choose "H2R - Translate" or
   "H2R - Lookup", the selected text is sent to the AI provider you configured in
   order to generate the translation, meaning, and examples shown in the tooltip.

3. **Settings.** Your chosen provider and optional model name are stored the same
   way as the API key.

## What we do NOT do

- We do **not** operate any server, and we do **not** receive, log, or store your
  API key, your selected text, or your translations.
- We do **not** sell or share any data with third parties.
- We do **not** use analytics, advertising, or tracking.
- We do **not** collect personally identifiable information.

## Third-party providers

When you trigger a translation, your selected text and API key are transmitted
directly from your browser to the provider you selected. That provider's handling
of the data is governed by its own privacy policy:

- Google Gemini: https://ai.google.dev/gemini-api/terms and https://policies.google.com/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- Anthropic (Claude): https://www.anthropic.com/legal/privacy

Please review the policy of the provider you choose.

## Permissions

The extension requests only the permissions required to function:

- `contextMenus` — to add the "H2R - Translate" / "H2R - Lookup" right-click items.
- `storage` — to save your provider, API key, and model preferences.
- `scripting` and `activeTab` — to display the result tooltip on the current page,
  including pages that were already open before the extension was installed.
- Host access to the three provider API domains (and the current page on which you
  request a translation) — to send requests and show results.

## Data removal

Your data lives only in your browser. To remove it, clear the extension's settings
(delete the API key in the options page) or uninstall the extension, which removes
all stored values.

## Changes

If this policy changes, the updated version will be published in the extension's
repository with a new "Last updated" date.

## Contact

For questions about this policy or the extension, contact:

- **Robiul Islam Robi**
- Email: hello2robi@gmail.com

You can also open an issue in the extension's source repository.
