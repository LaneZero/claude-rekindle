> Current beta: v2.7.1. Firefox popup width regression fixed.

# ClaudeRekindle by LaneZero

Unofficial browser utility that resumes **eligible, paused Claude.ai responses** by clicking the existing enabled Continue button. It never bypasses quotas, sends prompts automatically, or calls private Claude APIs. Independent of Anthropic.

> **Status:** v2.7.0-beta.1 mobile popup hardening. Automated parser tests and packaging validation only; not production/stable or verified on Firefox Android.

## Supported targets

| Target | Status | Behavior |
|---|---|---|
| Firefox Desktop | Beta, needs manual testing | Resume + startup reminders |
| Chrome/Chromium Desktop | Beta, needs manual testing | Resume + startup reminders |
| Firefox Android | Experimental | Background reminders may be delayed or unavailable |
| Tampermonkey | Legacy beta | Resume and in-page reminders only |

## Features

- Usage pause (`Paused when your free usage ran out`), timed pause, early response (`This response ended early`)
- Advisory usage warning with variable percentage, e.g. `Over 90% ... Resets at 5:00 PM`, records time but **never clicks Upgrade or Continue based on advisory alone**
- Continue scoped to Claude's warning banner, only when enabled
- Cooldowns, last result, local history, dismissible in-page panel
- Saved reset reminders on browser startup (extensions only); time passed is not proof of quota availability
- No chat-body, cookie or credentials collection

## Development

```bash
npm run test
npm run build
npm run check
```

`dist/chrome` is a Chrome unpacked extension. For Firefox desktop, open `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> `dist/firefox/manifest.json`. Temporary install disappears after browser restart. Chrome: `chrome://extensions` -> Developer mode -> Load unpacked -> `dist/chrome`.

`dist/tampermonkey/claude-rekindle.user.js` is preserved for backward compatibility. Its engine is still a legacy fork; future work should consolidate it with the pure detection core. Disable older versions before testing.

## Architecture

- `src/core/detection.js`: pure parser shared by Chrome and Firefox extension builds
- `src/extension`: single-source content, popup and background scripts
- `src/userscript.user.js`: preserved Tampermonkey baseline
- `config/manifest.*.json`: browser-specific configuration
- `scripts/build.mjs`: reproducible dist generation, no third-party build dependencies
- `tests`: Node built-in test runner for message parsing and clock semantics
- `.github/workflows/ci.yml`: runs checks on pushes and pull requests

### Privacy and safety

Extension permissions: `storage` for reminders, `alarms` for wake-up while the browser runs, `notifications` for user-visible prompts, `tabs` for opening the saved conversation; host access restricted to `https://claude.ai/*`. Notifications after browser startup are best-effort. The tool doesn't run after the entire browser is closed.

### Known engineering debt

1. **Cross-tab coordination:** background-mediated claims serialize clicks across tabs; verify actual browser behavior before stable release.
2. **LocalStorage scope:** content-script data sits in site-local storage, while reset schedule uses extension storage. Plan migration to extension storage.
3. **Tampermonkey engine:** still uses its separate legacy detection code; unify after cross-browser regression tests.
4. **DOM integration tests:** Node parser tests cannot prove button clicks or verify Claude UI behavior.
5. **Android:** needs actual device tests and Mozilla signing/installation validation. No guarantee that background reminders fire while Firefox is suspended.
6. **Popup last history:** currently operates only when a Claude tab is active.

Do not call the beta version stable until manual and automated browser QA passes. See `docs/ROADMAP.md` and `docs/GIT_GUIDE_FA.md`.

## Rebranding and migration (v2.5.0-beta.1)

The product is now **ClaudeRekindle by LaneZero**. Proposed repository: `LaneZero/claude-rekindle`.

- The existing `lanezero:claude-autoresume:v2:` localStorage keys are deliberately retained for continuity of settings and local history. They are legacy internal IDs, **not** the product name. Do not delete these keys until an explicit, tested migration exists.
- The Firefox Gecko extension ID changes to `claude-rekindle@lanezero`, so Firefox treats it as a separate extension. Disable/remove the old experimental extension to avoid double clicks; Firefox extension-local data is **not automatically migrated**.
- Chrome should likewise have only one of the old/new extensions enabled.
- Rebranding does not imply official affiliation with Anthropic; do not use Anthropic's official marks or suggest endorsement.
- No GitHub repository has been created or pushed by this archive.

## Reliability Beta v2.5

See [v2.5 release notes](docs/V2.5_RELEASE_NOTES.md) for cross-tab arbitration, test coverage, safety boundaries, and installation limitations.

## Reliability hardening v2.5.1

- Claims are serialized in the extension background with an opaque token. If the DOM action disappears before clicking, the holder releases that claim, avoiding a false cooldown.
- A competing tab cannot release someone else's claim; wrong tokens and other conversation URLs are rejected.
- A **banner_cleared** result means the warning DOM vanished after clicking. It does **not** prove answer generation completed or quota was replenished.
- The userscript is unchanged in this release, still on its independent engine.
- Browser integration and Firefox Android remain unverified.


## v2.6.0 Beta 1: Interface and branding

- Official visual identity derived from the user-supplied artwork. Source preserved in `assets/icon-original.png`.
- Generated icon sizes: 16, 32, 48, 64, 96, 128 and 256 px.
- Firefox and Chrome Popup tabs: Overview, Activity, About, Support.
- GitHub: https://github.com/LaneZero/claude-rekindle
- Support tab has Bitcoin, TRON/TRC20 USDT, EVM and Solana wallet addresses with network labels and copy actions. Confirm addresses and network before donating.
- No telemetry, remote analytics or third-party dependencies introduced.
- Tampermonkey gets its own embedded 32 px icon at build time. Popup redesign applies to Firefox and Chrome; Tampermonkey retains its in-page panel.

**Safety:** The extension does not bypass Claude usage limits. A removed banner is not proof a response completed.

## v2.7 beta — Mobile popup hardening

- Touch-friendly controls and narrow-screen layout.
- Show page panel tolerates unsupported Firefox Android window-focus APIs.
- Popup can read an already-open Claude chat even when another tab is selected.
- Open Claude and Refresh status buttons work without an active Claude chat.
- Android background execution is experimental, not guaranteed. See `docs/V2.7_RELEASE_NOTES.md` for the manual QA checklist.

### v2.7.2 local reset countdown
Reads hard quota banners such as `You are out of free messages until 10:00 PM`, shows the announced reset clock in the device local timezone and time remaining. Past the announced time it reports that availability is unconfirmed. No quota bypass, automatic prompt sending, or private API use. See `docs/V2.7.2_LOCAL_RESET.md`.

## v2.7.3 Beta 1: Monitoring interval and guarded refresh

- The **Settings** tab provides fallback DOM check intervals: **1, 2, 5 (default), 10, 15 minutes**. An observed DOM change still triggers an immediate, debounced check, so `This response ended early.` does not wait for the timer.
- **Safe page reload is opt-in and OFF by default.** When enabled, a reload can happen only if a hard quota warning remains after its announced local reset time, no Continue action exists, no pending attempt exists and no unsent input is detected. Maximum three attempts per tab session and never faster than the chosen interval.
- An interval check is *local DOM inspection*, not polling private Claude endpoints. A page reload does make an ordinary browser navigation request.
- On Tampermonkey, set intervals and safe reload via the Tampermonkey menu. On Firefox/Chrome, use Settings in the toolbar Popup.
- No refresh is run while the browser is closed or the device is asleep; timers may be throttled in background tabs. Firefox Android requires actual device verification.
- **Known limit:** This is intentionally conservative but cannot guarantee preservation of every transient in-page state, especially unsaved uploads. Leave safe reload off for critical or lengthy jobs.

## v2.7.5 Beta 1: dated reset notices and About icon

- Recognizes `Paused: Your free usage returns Nov 5 at 1:10 AM` and `You are out of free messages until tomorrow at 1:10 AM` as well as undated reset notices.
- Handles date-aware browser-local countdown and shows when the announced reset has passed without claiming the quota is definitely restored.
- Keeps monitoring disabled Continue buttons; no quota bypass, no automatic prompt submission.
- Corrects the About icon by including the 64px asset in both builds and loading images with `runtime.getURL`.
- Browser/mobile installation and actual DOM behavior still require manual validation.
