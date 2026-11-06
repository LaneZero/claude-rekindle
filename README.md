<div align="center">

# ClaudeRekindle

**Keep track of Claude.ai usage pauses. Resume eligible interrupted responses when Continue becomes available.**

A lightweight, unofficial browser extension by **[LaneZero](https://github.com/LaneZero)**.

[![Version](https://img.shields.io/badge/version-2.8.0-2563eb?style=flat-square)](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0)
[![Release](https://img.shields.io/badge/release-stable-16a34a?style=flat-square)](https://github.com/LaneZero/claude-rekindle/releases)
[![Chrome](https://img.shields.io/badge/Chrome-Chromium-4285F4?logo=googlechrome&logoColor=white&style=flat-square)](#installation)
[![Firefox](https://img.shields.io/badge/Firefox-Desktop-FF7139?logo=firefoxbrowser&logoColor=white&style=flat-square)](#installation)
[![License](https://img.shields.io/github/license/LaneZero/claude-rekindle?style=flat-square)](LICENSE)

[Features](#features) · [Screenshots](#screenshots) · [Installation](#installation) · [How it works](#how-it-works) · [Privacy](#privacy--security) · [Development](#development)

</div>

> [!IMPORTANT]
> ClaudeRekindle **does not bypass usage limits**, generate new prompts, or access private Claude APIs. It can only activate an **existing, enabled Continue button** in eligible situations. An announced reset time does **not** guarantee that access has been restored.

## Screenshots

<div align="center">
  <img src="Images/screenshot01.png" alt="ClaudeRekindle extension interface showing monitoring status and usage information" width="780" />
  <p><sub>ClaudeRekindle v2.8.0 · Extension interface</sub></p>
</div>

> The screenshot is stored in [`Images/screenshot01.png`](Images/screenshot01.png). Additional screenshots can be added to this section as the project evolves.

## Get ClaudeRekindle

| Platform | Installation | Support |
|:--|:--|:--|
| **Google Chrome / Chromium** | **Chrome Web Store: Coming soon** | Desktop · Stable source build |
| **Mozilla Firefox** | **Firefox Add-ons: Coming soon** | Desktop · Stable source build |
| **Firefox for Android** | Firefox Add-ons listing pending | Experimental |
| **Tampermonkey** | [GitHub release downloads](https://github.com/LaneZero/claude-rekindle/releases/latest) | Legacy userscript |

**Store links to insert after approval:**

<!-- Replace the placeholder URL below after the Chrome Web Store listing is live:
Chrome Web Store: https://chromewebstore.google.com/detail/REPLACE_WITH_ACTUAL_LISTING
-->

<!-- Replace the placeholder URL below after the Firefox Add-ons listing is live:
Firefox Add-ons: https://addons.mozilla.org/firefox/addon/REPLACE_WITH_ACTUAL_SLUG/
-->

**Until the store listings are published:** download the appropriate package from [GitHub Releases](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0). Store-ready, permanently installable builds may require platform signing or review.

## Features

- **Eligible auto-resume:** detects supported Claude.ai pause / early-ended notices and interacts only with the existing enabled Continue control.
- **Usage-limit detection:** recognizes free-message quota banners, including notices with an AM/PM time, “tomorrow”, or an explicit date.
- **Local reset countdown:** displays the time remaining until Claude's *announced* reset; distinguishes an expired announcement from confirmed availability.
- **Best-effort reminders:** browser notifications when the announced reset time arrives, subject to browser permissions and background execution.
- **Configurable checks:** selectable monitoring intervals of **1, 2, 5, 10, or 15 minutes**.
- **Optional guarded reload:** disabled by default, with safeguards designed to avoid reloading while content may be unsent or an eligible action is pending.
- **Status and activity UI:** Overview, Activity, Settings, About, and Support, plus an in-page monitoring panel.
- **Cross-browser architecture:** shared detection and extension code for Chrome and Firefox, with a generated legacy Tampermonkey distribution.

## How it works

1. Claude.ai displays a supported pause or free-message usage notice.
2. ClaudeRekindle reads the relevant notice locally and displays its monitoring state. If a reset time is announced, it displays a countdown.
3. When an *eligible, enabled* Continue button is detected in the appropriate warning context, the extension may activate that existing button using guarded checks and cooldowns.
4. If the reset time arrives without an actionable Continue button, the extension can **notify you to check Claude.ai**. It does not claim that the quota has definitely refreshed.

**It never clicks Upgrade, bypasses a rate limit, or automatically sends a new user message.**

## Installation

### Chrome / Chromium (unpacked development build)

1. Download `ClaudeRekindle-2.8.0-chrome.zip` from [v2.8.0 Releases](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0) and extract it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked**, then choose the extracted extension folder containing `manifest.json`.
4. Visit `https://claude.ai/` and open the ClaudeRekindle popup.

### Firefox Desktop (temporary development build)

1. Download and extract `ClaudeRekindle-2.8.0-firefox.zip`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**, then choose the extracted `manifest.json`.
4. The temporary add-on is removed on browser restart. A permanent Firefox installation generally requires a signed distribution.

### Firefox Android and Tampermonkey

Firefox Android support is **experimental**; background timers and notifications may be delayed or unavailable. The Tampermonkey build is a **legacy** distribution with different background and multi-tab behavior from browser extensions. Do not run the userscript and the extension simultaneously on the same Claude.ai page.

## Compatibility

| Platform | Status | Notes |
|:--|:--|:--|
| Chrome / Chromium desktop | Stable source release | Notifications depend on permissions and browser runtime |
| Firefox Desktop | Stable source release | Permanent installation may require signing |
| Firefox Android | Experimental | Background execution is not guaranteed |
| Tampermonkey | Legacy | In-page reminders; no extension-style background service |

## Privacy & security

- ClaudeRekindle operates locally in your browser and does not include external analytics or telemetry.
- It does not intentionally collect chat bodies, login credentials, or cookies for transmission to a server.
- Its host access is limited to the Claude.ai site; browser permissions support local settings, alarms, notifications, and opening a Claude tab.
- Controls are scoped to supported notices, rather than arbitrary buttons on the page.
- It is **not affiliated with, endorsed by, or sponsored by Anthropic**.

Read the full [Privacy Policy](PRIVACY.md) and [Release Checklist](docs/RELEASE_CHECKLIST.md).

## Development

**Requirements:** Node.js 20+; Python 3 for release packaging.

```bash
# Run the parser, status and regression tests
npm run test

# Build Chrome, Firefox and Tampermonkey distributions
npm run build

# Run the full release readiness checks
npm run release:check

# Generate local release archives and SHA-256 checksums
npm run release:pack
```

The build outputs are written to `dist/`; release archives are written to `release/`. Both directories are excluded from Git. Publish generated archives as **GitHub Release assets**, not source commits.

### Project structure

```text
assets/                 Extension branding and source icons
config/                 Browser-specific extension manifests
Images/                 Screenshots for this README
src/core/               Shared message detection and time parsing
src/extension/          Popup, content scripts and background logic
src/userscript.user.js  Legacy Tampermonkey entry point
scripts/                Build, preflight and release packaging
tests/                  Automated regression tests
docs/                   Technical notes and release documentation
```

For further details, see [Changelog](CHANGELOG.md), [Git Workflow](docs/GIT_GUIDE_FA.md), and [Release Checklist](docs/RELEASE_CHECKLIST.md).

## Limitations

- Claude.ai can change its DOM or wording at any time; detection may need updates.
- Notifications require browser support and permission. They are **not guaranteed while the browser is fully closed** or the device is suspended.
- A warning disappearing or a reset deadline passing is **not proof** that a response has completed or that Claude usage is available again.
- The optional safe reload should remain **off** for critical work containing unsaved content.

## Contributing & support

Bug reports and well-scoped feature requests are welcome through [GitHub Issues](https://github.com/LaneZero/claude-rekindle/issues). Please avoid including private conversations, account details or tokens in reports.

For release packages and version history, see [GitHub Releases](https://github.com/LaneZero/claude-rekindle/releases).

---

<div align="center">

**ClaudeRekindle** · Developed by **[LaneZero](https://github.com/LaneZero)**  
Independent, unofficial software. Not associated with Anthropic.

</div>
