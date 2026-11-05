# ClaudeRekindle

**A small, local-first browser extension to resume eligible paused Claude responses and remind you when Claude's announced usage-reset time arrives.**

[![Version](https://img.shields.io/badge/version-2.8.0-blue)](https://github.com/LaneZero/claude-rekindle/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Project](https://img.shields.io/badge/maintainer-LaneZero-6f42c1)](https://github.com/LaneZero)

**Created by LaneZero** · [Releases](https://github.com/LaneZero/claude-rekindle/releases) · [Report an issue](https://github.com/LaneZero/claude-rekindle/issues) · [Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md)

> [!IMPORTANT]
> ClaudeRekindle is an **unofficial, independent project**. It is not affiliated with, endorsed by, or sponsored by Anthropic. It **does not bypass usage limits**, automatically send new prompts, or call private Claude APIs. It can only interact with existing, eligible **enabled Continue** controls shown by Claude.

## What it does

When Claude pauses a response because free usage has run out, its interface may show a **Continue** button that is disabled until the announced reset. ClaudeRekindle watches for supported pause messages, keeps track of the announced local reset time, and attempts to resume only when the existing Continue control becomes eligible and enabled.

If Claude displays a general notice such as `You are out of free messages until 10:20 PM` **without a Continue button**, the extension still records the announced time and can show a countdown and a best-effort reminder. **An announced reset time is not proof that usage has been restored.**

It also recognizes supported prematurely ended responses (`This response ended early.`) and checks for an eligible Continue control. It never clicks **Upgrade**.

## Platform support

| Platform | Distribution | Support level |
| --- | --- | --- |
| Chrome / Chromium (desktop) | Manifest V3 extension | Stable source release; manually load unpacked for local testing |
| Firefox (desktop) | Firefox extension | Stable source release; temporary loading for local testing |
| Firefox for Android | Firefox extension | **Experimental**; background execution and installation depend on Android/Firefox |
| Tampermonkey | Generated `.user.js` script | **Legacy**; in-page behavior, not equivalent to an extension background worker |

> Store-signed Chrome/Firefox packages are **not** included in the source release. The project must be separately submitted and approved by each store. Avoid running multiple copies of ClaudeRekindle, or the extension and userscript together, on the same Claude page.

## Features

- **Conservative automatic Continue:** only a currently enabled Continue control associated with a recognized pause/early-ending notice is eligible; no prompt submission or quota bypass.
- **Quota notice recognition:** supports `You are out of free messages until 10:20 PM`, notices containing `tomorrow at ...`, and supported dated forms such as `Nov 5 at 1:10 AM`.
- **Visible-text extraction:** avoids hidden accessibility descriptions inside Claude's hyperlinks, including `(opens in new tab)`.
- **Local countdown:** shows the announced reset clock and remaining time in the toolbar popup, even when no paused response is available.
- **Best-effort notifications:** can alert when the announced reset time arrives, subject to browser permissions and background execution. A reminder means **check Claude**, not **quota definitely restored**.
- **Responsive popup:** Overview, Settings, Activity, About and Support; includes local recent activity, an in-page monitoring panel, and JSON export.
- **Monitoring settings:** choose a fallback DOM-check interval of **1, 2, 5 (default), 10 or 15 minutes**. DOM changes can trigger earlier checks.
- **Optional guarded page reload:** **OFF by default**. When enabled, the extension avoids reloads where a visible Continue control, pending attempt, or unsent draft is detected. Maximum three reload attempts per tab session; still not a guarantee against losing all transient state, especially uploads.
- **Cross-tab coordination (extensions):** a background claim system helps prevent duplicate resume attempts for the same conversation.
- **User control and privacy:** enable or disable monitoring, close/reopen the page panel, keep local history, and export local activity without sending it to LaneZero.

### How the status should be interpreted

| Status or event | Meaning |
| --- | --- |
| `Continue unavailable` | No eligible Continue control was found |
| `Continue disabled · waiting for reset` | The control exists, but is disabled |
| `Continue visible · awaiting safe verification` | A visible enabled control was observed; the safety checks still govern any click |
| `Usage limit` and a countdown | Claude has announced a local reset time; access is not verified |
| `Reset time passed` | The announced time passed; actual quota availability is unknown |
| `banner_cleared` in history | A warning/banner disappeared after an attempt; **not** proof a response finished |

Messages and DOM structure on Claude.ai can change at any time. Unknown wording or UI variations can prevent detection; please report reproducible examples with sensitive content removed.

## Installation and testing

### Requirements

- **Node.js 20+** to build from source.
- **Python 3** only for the optional ZIP release-packaging command.
- Chrome/Chromium or Firefox desktop for unpacked/temporary local installation.

Download a source archive from [GitHub Releases](https://github.com/LaneZero/claude-rekindle/releases), or clone the repository:

```bash
git clone https://github.com/LaneZero/claude-rekindle.git
cd claude-rekindle
npm run check
```

There is no dependency installation step for the current Node-based build scripts. This project uses Node's built-in test runner.

### Chrome / Chromium desktop

1. Run `npm run build` from the repository root (or extract the Chrome ZIP from a release).
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the **`dist/chrome`** directory (or the extracted Chrome package directory containing `manifest.json`).
4. Open `https://claude.ai/` and verify the toolbar popup. Reload the Claude tab after updating the unpacked extension.

### Firefox desktop

1. Run `npm run build` (or extract the Firefox release package).
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select **`dist/firefox/manifest.json`** (or `manifest.json` in the extracted Firefox package).
4. Open Claude and test the popup and in-page panel.

**Temporary Firefox add-ons are removed after a browser restart.** Permanent installation requires the appropriate signed extension distribution; a raw ZIP containing a Firefox manifest is not a signed marketplace add-on.

### Firefox for Android (experimental)

Installation methods vary by Firefox Android release and add-on policies. A desktop ZIP is **not** proof that the Android add-on can be installed, signed, or kept active in the background. Test on the target Firefox Android build and expect reminders to be delayed or unavailable when the OS suspends the browser.

### Tampermonkey (legacy)

Build and open `dist/tampermonkey/claude-rekindle.user.js` using Tampermonkey's script-import workflow, or extract it from the Tampermonkey ZIP. This version has an in-page panel and local checks; it does not provide the same extension-background notifications or cross-tab guarantees. **Disable the browser extension on the same page when testing the userscript.**

## Usage

1. Open Claude.ai and use Claude normally. ClaudeRekindle does not send prompts on your behalf.
2. When Claude shows a supported pause or usage-limit notice, open the toolbar popup **Overview** tab to see the detected status and, where available, the announced reset countdown.
3. Leave **Automatic Continue** enabled to allow eligible Continue attempts after the button is enabled by Claude. Disabling monitoring should also suppress scheduled reminder behavior.
4. Open **Settings** to adjust fallback inspection intervals; keep **Safe page reload** off unless you understand the risks.
5. Use **Activity** for local outcome history and **Export JSON** to export local status data. The **Show page panel** action opens the small status panel inside Claude.

The extension uses normal browser permissions, and scheduled reminders work only on a **best-effort** basis. A fully closed browser or suspended mobile process cannot be relied upon to notify at the exact announced time.

## Safety and privacy

ClaudeRekindle operates only on `https://claude.ai/*` for site interaction. It inspects relevant banner/notice text, the Continue control's state, announced reset notices, and whether an unsent draft is present before an optional reload. It does **not** intentionally capture conversation bodies, passwords, cookies, or uploaded file contents for storage or transmission.

| Permission | Why it is requested |
| --- | --- |
| `https://claude.ai/*` | Inspect Claude notices and eligible Continue controls |
| `storage` | Save preferences, announced reset times, coordination and local activity |
| `alarms` | Schedule reminders when the browser's background execution permits |
| `notifications` | Alert when an **announced** reset time arrives |
| `tabs` | Locate or open Claude tabs and respond to a clicked reminder |

No LaneZero analytics service, telemetry endpoint or private Claude API is used by the supplied source. Local records may include conversation pathnames and timestamps. See the full [Privacy Policy](PRIVACY.md) for storage details and deletion guidance.

## Build, tests and release checks

```bash
npm run test            # Shared parser and behavior tests (also syncs userscript)
npm run build           # Chrome, Firefox and Tampermonkey distributions
npm run check           # Tests + builds
npm run test:browser    # Optional browser DOM harness; requires a compatible browser environment
npm run release:check   # Tests + build + static release preflight
npm run release:pack    # Create local ZIP files and SHA-256 checksums (Python 3)
```

Build output is written to `dist/`; packaged assets are written to `release/`. These directories, as well as generated ZIP/XPI/CRX artifacts, are excluded from Git by `.gitignore`. If older artifacts were already committed, `.gitignore` alone does not untrack them.

**Publishing is manual:** none of the commands above pushes to GitHub, creates Git tags, signs add-ons, or uploads a marketplace listing. Verify [SHA-256 hashes](https://github.com/LaneZero/claude-rekindle/releases) from the corresponding release before distributing files.

### Repository layout

```text
assets/                  Brand assets and extension icons
config/                  Chrome and Firefox manifests
src/core/detection.js    Shared notice / time / Continue parsing
src/extension/           Content script, popup, background, UI styles
src/userscript.user.js   Tampermonkey userscript generated from shared source
scripts/                 Build, sync, preflight and packaging utilities
tests/                   Node tests and DOM fixtures
docs/                    Release notes, support and QA documentation
.github/workflows/       CI checks
PRIVACY.md               Data practices and permissions
CHANGELOG.md             Version history
LICENSE                  MIT license
```

## Known limitations

- Claude UI changes or alternative languages may make a notice unrecognizable until the parser is updated.
- A disabled Continue button cannot be clicked, and the announced reset clock does not guarantee it will become enabled.
- `banner_cleared` does **not** mean generation finished or the response is complete.
- The extension cannot reliably run or notify while the **entire browser is closed**; Android background behavior is particularly constrained.
- Cross-tab claim handling reduces duplicate activity but does not eliminate every possible real-world race condition.
- **Safe page reload** cannot guarantee preservation of every in-progress task, unsaved upload or transient browser state. It stays off by default.
- Firefox Android remains experimental and Tampermonkey remains a legacy alternative.

## Contributing, issues and releases

Use [Issues](https://github.com/LaneZero/claude-rekindle/issues) to report a bug or suggest an improvement. For detection problems, include the **browser and version**, ClaudeRekindle version, a **redacted** notice text or HTML fragment, whether Continue is present/enabled, and the expected versus observed behavior. **Do not post conversation text, cookies, tokens or private account details.**

For changes, work in a feature/fix branch, run `npm run release:check`, and open a pull request against `develop` when that is the repository's active integration branch. Reserve `main` for reviewed releases. See [Release Checklist](docs/RELEASE_CHECKLIST.md), [Release Notes](docs/V2.8_RELEASE_NOTES.md), [Security QA](docs/RC5_FINAL_AUDIT_FA.md), and [Roadmap](docs/ROADMAP.md).

## Support the project

ClaudeRekindle is free, open-source software. The popup's **Support** tab contains optional donation addresses; verify the full address **and network** before transferring funds. Donations do not affect how the extension works or grant any Claude usage benefits.

## License and disclaimer

[MIT License](LICENSE). Copyright © 2026 LaneZero.

**ClaudeRekindle is unofficial.** Anthropic and Claude are trademarks of their respective owners. This project neither evades usage limits nor guarantees that Claude will resume or that browser notifications will arrive on time.
