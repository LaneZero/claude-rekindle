<div align="center">

# ClaudeRekindle

**Stay informed when Claude.ai pauses. Resume eligible responses when Continue is available.**

A lightweight, privacy-conscious browser extension built by **[LaneZero](https://github.com/LaneZero)**.

[![Latest release](https://img.shields.io/github/v/release/LaneZero/claude-rekindle?display_name=tag&label=release)](https://github.com/LaneZero/claude-rekindle/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome%20%2F%20Chromium-supported-4285F4?logo=googlechrome&logoColor=white)](#installation)
[![Firefox](https://img.shields.io/badge/Firefox%20Desktop-supported-FF7139?logo=firefoxbrowser&logoColor=white)](#installation)
[![GitHub issues](https://img.shields.io/github/issues/LaneZero/claude-rekindle)](https://github.com/LaneZero/claude-rekindle/issues)

[**Download v2.8.0**](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0) · [**Features**](#features) · [**Install**](#installation) · [**Privacy**](#privacy-and-security) · [**Report a bug**](https://github.com/LaneZero/claude-rekindle/issues/new)

</div>

> [!IMPORTANT]
> **ClaudeRekindle does not bypass Claude's usage limits.** It does not send prompts, call private Claude APIs, or unlock access. It only interacts with an **existing, enabled Continue control** in an eligible paused response. A reset notification means *the announced time has arrived*, not that access is confirmed.

## Preview

<div align="center">
  <a href="Images/screenshot01.png">
    <img src="Images/screenshot01.png" alt="ClaudeRekindle monitoring panel and status interface" width="820" />
  </a>
  <p><sub>ClaudeRekindle v2.8.0 · Click to view the full-size screenshot</sub></p>
</div>

<!-- Additional screenshots: place them in Images/ and add separate entries here. -->

## Get the extension

| Platform | Installation | Availability |
| --- | --- | --- |
| **Chrome / Chromium** | **Chrome Web Store — coming soon** | [GitHub release](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0) |
| **Firefox Desktop** | **Firefox Add-ons — coming soon** | [GitHub release](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0) |
| **Firefox Android** | Add-on distribution pending | Experimental; background behavior varies |
| **Tampermonkey** | [Legacy userscript package](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0) | Legacy |

<!-- STORE LINKS: replace the plain "coming soon" text above once listings are approved.
Chrome Web Store: https://chromewebstore.google.com/detail/<actual-id>
Firefox Add-ons:  https://addons.mozilla.org/firefox/addon/<actual-slug>/
Do not publish invented store URLs.
-->

Store availability and browser signing requirements are separate from the source release. The Firefox ZIP is **not** advertised as a permanently installable, signed add-on.

## Features

| Feature | What it does |
| --- | --- |
| **Guarded auto-resume** | Detects eligible paused or early-ended responses and uses the existing enabled **Continue** button when safety checks allow it. |
| **Usage-limit detection** | Recognizes supported usage banners, including notices with a time, `tomorrow`, or an explicit date. |
| **Live countdown** | Shows the time remaining until the reset announced by Claude, using local browser time. |
| **Reset reminders** | Can notify you when the announced time arrives, even when no Continue button exists. |
| **Monitoring settings** | Offers 1, 2, 5, 10, and 15-minute monitoring intervals. |
| **Optional safe reload** | Opt-in only, with safeguards to reduce the risk of interrupting unsent content or in-progress actions. |
| **Status & activity** | In-page monitoring panel and extension popup with monitoring state, recent activity, settings, About, and Support. |
| **Cross-browser builds** | Shared detection logic for Chrome and Firefox, plus a legacy Tampermonkey distribution. |

### Understand the status

- **Usage limit / countdown:** Claude has announced a reset time. The extension tracks that announcement; it does not predict actual access.
- **Continue unavailable:** No eligible Continue control was found in the relevant context.
- **Continue disabled:** A Continue control is present but is not currently actionable.
- **Continue visible / awaiting verification:** A candidate control is visible. The extension still applies safety checks before taking any action.
- **Reset time passed:** The announced time has elapsed. Claude may still need to be checked manually.

Status text is informational; it is not a guarantee that a response has completed.

## How it works

1. A supported Claude.ai notice appears, such as a response pause or a free-message limit.
2. ClaudeRekindle reads **relevant on-page notice text locally**, determines the monitoring state, and stores an announced reset time when available.
3. For an eligible paused response, it checks whether the existing Continue control is enabled and safe to activate.
4. If the reset time arrives without an available Continue control, it can show a **check-Claude reminder** instead of attempting to send a new prompt.
5. The popup and in-page panel display the current state without unnecessarily rebuilding the interface.

**Never interpreted as a resume command:** Upgrade links, unrelated page buttons, quota percentage advisories, or merely reaching an announced reset time.

## Installation

### Chrome / Chromium (unpacked package)

1. Download **`ClaudeRekindle-2.8.0-chrome.zip`** from the [v2.8.0 release](https://github.com/LaneZero/claude-rekindle/releases/tag/v2.8.0).
2. Extract the archive into a permanent local folder.
3. Open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked**.
4. Choose the folder containing `manifest.json`.
5. Open `https://claude.ai/`, then open the extension popup to review monitoring settings.

### Firefox Desktop (temporary development installation)

1. Download and extract **`ClaudeRekindle-2.8.0-firefox.zip`**.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on** and choose `manifest.json` from the extracted folder.
4. Remember that this temporary installation is typically removed when Firefox restarts. Permanent distribution generally requires Mozilla signing.

### Firefox Android and Tampermonkey

Firefox Android is **experimental**: background execution, notifications, and add-on installation depend on device and browser support. The Tampermonkey package is a **legacy option** with different background capabilities. **Do not enable both the extension and the userscript on the same Claude.ai page.**

## Privacy and security

- **Local operation:** ClaudeRekindle uses browser-side processing and does not include external analytics or telemetry in its project implementation.
- **No new prompts:** It does not submit a new conversation message on your behalf.
- **No private APIs:** It does not use private Claude endpoints or bypass quotas.
- **Scoped interactions:** Automatic clicks are limited to eligible Continue controls, not arbitrary buttons.
- **Minimal reporting:** When opening an issue, share sanitized logs or screenshots only. Never upload private chats, authentication tokens, or cookies.

Review the [Privacy Policy](PRIVACY.md) and [release audit](docs/RC5_FINAL_AUDIT_FA.md) for more detail.

> [!NOTE]
> This is an **unofficial**, independently developed tool. ClaudeRekindle is not affiliated with, endorsed by, or sponsored by Anthropic.

## Compatibility and limitations

| Environment | Status | Notes |
| --- | --- | --- |
| Chrome / Chromium desktop | Supported | Notifications depend on browser and OS permissions. |
| Firefox Desktop | Supported | Permanent add-on installation generally requires signing. |
| Firefox Android | Experimental | Background timers and notifications may be delayed or unavailable. |
| Tampermonkey | Legacy | In-page behavior differs from a browser extension. |

Claude.ai can change its interface and banner wording. Browser suspension, OS notification settings, or closing the browser may prevent an on-time notification. **The end of a countdown is not proof of restored access.**

## Development

**Requirements:** Node.js **20+** and Python **3** for release archive packaging.

```bash
# Install dependencies, if any are declared by the project
npm install

# Run regression tests and generate browser builds
npm run check

# Run complete release preflight
npm run release:check

# Create local release archives and SHA-256 checksums
npm run release:pack
```

Generated output belongs in `dist/` and `release/`. Both paths are ignored by Git; upload verified binaries as **GitHub Release assets**, not as repository source files.

<details>
<summary><strong>Repository layout</strong></summary>

```text
assets/                   Source icons and branding
config/                   Chrome and Firefox manifests
Images/                   README screenshots
src/core/                 Shared notice detection and time parsing
src/extension/            Popup, content script, and background logic
src/userscript.user.js    Legacy Tampermonkey distribution
scripts/                  Build, checks, and packaging
tests/                    Regression tests
docs/                     Technical and release documentation
```

</details>

## Contributing and support

Bug reports and focused pull requests are welcome. Please open an [issue](https://github.com/LaneZero/claude-rekindle/issues) with the browser version, extension version, steps to reproduce, expected behavior, and **sanitized** screenshots. For security-sensitive concerns, avoid disclosing exploit details or personal data publicly.

- [Latest release](https://github.com/LaneZero/claude-rekindle/releases/latest)
- [Changelog](CHANGELOG.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Roadmap](docs/ROADMAP.md)
- [MIT License](LICENSE)

---

<div align="center">
  <sub>Built and maintained by <strong><a href="https://github.com/LaneZero">LaneZero</a></strong> · MIT licensed · Unofficial project</sub>
</div>
