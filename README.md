# ClaudeRekindle by LaneZero

Unofficial browser utility that resumes **eligible, paused Claude.ai responses** by clicking the existing enabled Continue button. It never bypasses quotas, sends prompts automatically, or calls private Claude APIs. Independent of Anthropic.

> **Status:** v2.5.0-beta.1 engineering baseline. Automated parser tests and packaging validation only; not production/stable or verified on Firefox Android.

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

1. **Cross-tab coordination:** currently click cooldown is per tab; multiple tabs on the same conversation may race. Required before stable release.
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
