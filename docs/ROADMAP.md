# Engineering roadmap

## Phase 0 — baseline (this repository)
- [x] Reusable source for Chrome and Firefox
- [x] Pure shared message/time parser and test cases
- [x] Repeatable build and GitHub Actions
- [ ] Real-browser smoke tests

## Phase 1 — trustworthy operation
- [ ] Coordinate attempts for same conversation across tabs
- [ ] Integrate fixture-based DOM testing with real selectors and disabled button variants
- [ ] Improve confirmation state machine (clicked / banner cleared / generating / failed)
- [ ] Handle local-time changes, DST and message locale variations
- [ ] Add test harness without using Claude usage quota

## Phase 2 — user experience
- [ ] Native notifications with deduplication and dismiss controls
- [ ] Browser-independent preferences, local-only history and export
- [ ] Popup countdown and privacy explanation
- [ ] One-time migration from legacy localStorage to extension storage

## Phase 3 — platform QA
- [ ] Firefox Desktop signed XPI
- [ ] Chrome/Chromium store review preparation
- [ ] Firefox for Android device smoke + background suspension tests
- [ ] Userscript regression and shared engine migration
- [ ] v3.0 release after security/accessibility and failure-mode checklist
