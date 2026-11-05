# ClaudeRekindle v2.8.0 RC2 · Security and QA

## Scope

- Chrome / Chromium and Firefox MV3 builds, experimental Firefox Android package, Tampermonkey userscript.
- One canonical detection engine shared across platforms; no bypass of Claude quotas.
- Local-only preferences, attempt records, scheduled reset timestamps and conversation URL path identifiers.

## Automated verification

- `npm run release:check`: 40 Node tests and successful builds and static release checks.
- Tests cover concurrent claims, token-bound release, timed/quota/early-stop parsing, timer state, popup UI, limited permissions, image assets, and concurrent reset schedules.
- The new reset serialization prevents two tabs from overwriting each other's pending reminder entry.
- Invalid tab origins, nonmatching conversation paths and invalid reset timestamps are rejected.
- Malformed notification IDs cannot result in a navigation.
- `release/`, `dist/`, and local dependency folders are ignored by Git.

## Remaining manual gates (not validated here)

- [ ] Chrome: enabled Continue, disabled Continue, quota warning, timer, page reload safeguards and closing/reopening browser.
- [ ] Firefox Desktop: same scenarios and popup About icon, links and notifications.
- [ ] Firefox Android: extension installation, background restrictions, popup dimensions and notification delivery.
- [ ] Browser update/upgrade: previous settings and recent history preserved; no competing old versions installed.
- [ ] Verify correct behavior with concurrent tabs, slow networks, logged-out sessions and offline mode.
- [ ] Confirm wallet addresses manually before publishing; network mistakes can cause irreversible loss.
- [ ] Review store policies and sign/store-package separately before production listing.

## Security observations

- The extension remains limited to `https://claude.ai/*`. No network access to LaneZero is implemented.
- Browser notifications report an *announced time passing*, not proven quota restoration.
- No unauthorized prompt sending, no hidden API calls, and no authentication cookie access are implemented.
- `Safe page reload` remains opt-in. It cannot be guaranteed to preserve all in-progress page work.
- `chrome.storage.local` and Claude-origin localStorage are distinct. Site storage can be accessible to Claude page scripts; this tool intentionally stores no secrets there.

## Release decision

**RC2 is appropriate for GitHub pre-release testing, not an attested stable browser-store release.**
Automated tests do not establish actual browser or mobile runtime reliability.
