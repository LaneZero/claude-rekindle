# ClaudeRekindle release checklist (v2.8.0 RC1)

## Automation gates
- [ ] `npm run release:check` passes on clean checkout (including CI).
- [ ] `npm run release:pack` generates three target ZIPs, source ZIP and SHA256SUMS.txt from the same checkout.
- [ ] `git status --short` is clean; no credentials, `.env`, compiled cache or source maps in release archives.
- [ ] Manifest versions, UI version, privacy URL, icons, minimum permissions verified.

## Browser manual gates (required before stable)
- [ ] Chrome: install unpacked, icon in toolbar and About, five tabs legible, no popup width regression.
- [ ] Firefox Desktop: same, confirm Show page panel and closing/reopening.
- [ ] Firefox Android: *real device*, popup usability, installation/signing, background reminder limits documented.
- [ ] Verify only explicit warning banners lead to clicks; never click Upgrade/generic Continue.
- [ ] Disabled Continue and quota future time: never click.
- [ ] Dated `Nov 5 at 1:10 AM` and `tomorrow at`: correct local countdown across midnight.
- [ ] Early response ended: single click when enabled; no click storm after rerender.
- [ ] Multiple tabs: only one granted click per conversation and cooldown.
- [ ] Browser restart: saved reset triggers accurate *estimated* reminder, no false claim of restored usage.
- [ ] Draft or ongoing response: Safe Reload cannot discard text; keep reload OFF by default.
- [ ] No network requests to developer/donation address; inspect browser extension network panel.

## Publication gates
- [ ] Obtain required store accounts and test signing; upload only after manual QA.
- [ ] Chrome Web Store: privacy disclosure, narrow permissions explanations, screenshots, support URL and branding review.
- [ ] Firefox Add-ons: signed XPI for distribution, Android support verified on device.
- [ ] Note unofficial affiliation. No claim to bypass Claude limits, no promise to resume with browser closed.
- [ ] Tag `v2.8.0-rc.1` only after branch merged and CI green.
- [ ] Publish GitHub **pre-release**, not stable; add changelog and checksums for artifacts.
