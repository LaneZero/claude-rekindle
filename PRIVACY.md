# Privacy policy: ClaudeRekindle

**Last updated:** November 5, 2026. **Developer:** LaneZero.

ClaudeRekindle is an unofficial browser extension and userscript for claude.ai. It does not bypass usage limits or use private Claude APIs.

## What it reads

On `https://claude.ai/*`, it inspects visible warning/banner text, the presence and enabled state of the existing Continue button, local reset notices, and whether unsent input is present before an optional page reload. It does **not** record or send conversation bodies, passwords, authentication cookies, or file contents.

## What it stores on your device

- Locally: preferences, per-conversation pathname (which may identify a conversation), announced reset timestamps, notification status, bounded recent attempt history (timestamp, reason, result), cooldown/coordination records.
- The content script uses site `localStorage` and `sessionStorage`; the browser extension background uses `chrome.storage.local`. This data can persist until the extension/browser data is cleared.
- Tampermonkey stores its state in the Claude origin's storage when running on the site.

**No analytics, tracking, or remote data collection** is implemented in the supplied source. ClaudeRekindle does not transmit stored data to LaneZero, third-party servers, or donation services. The browser naturally communicates with Claude when you view Claude or when the tool clicks the site’s existing Continue button. Optional GitHub links are opened only when clicked.

## Permissions

- `https://claude.ai/*`: recognize pauses and click the existing, enabled Continue button.
- `storage`: save reset timestamps, attempt coordination and reminder state.
- `alarms`: schedule best-effort reminders while the browser runs.
- `notifications`: notify users of a *scheduled time passing*, not guaranteed quota availability.
- `tabs`: locate/open Claude chat tabs and follow a clicked reminder.

## User control

Disable the extension with its toggle or browser add-on settings. Close the in-page panel without disabling monitoring. Clear site/extension storage or uninstall to remove local records. Safe page reload is **off by default**. This project does not work while the whole browser is closed; reminders may appear on next startup.

## Contact / changes

Report issues at https://github.com/LaneZero/claude-rekindle/issues. Updates that change data practices must update this policy before distribution.
