# Changelog

## Unpublished 2.8.0 UI refinement (same version number)

- Distinguish unavailable, disabled, and visible Continue controls in read-only status reporting.
- Avoid redundant panel text and display-style writes during countdown updates.
- Reserve stable status layout height and disable live announcements for each timer refresh.
- Preserve all existing automatic-click safety checks and release packaging.

## [2.8.0] — 2026-11-05

- Stable source release baseline for Chrome/Chromium and Firefox Desktop.
- Fix quota banner extraction containing hidden `(opens in new tab)` accessibility text.
- Support reset notices with clock-only, `tomorrow`, and month/day dates.
- Add reset countdown and single best-effort notification at the announced reset time.
- Separate quota banner detection from Continue-button eligibility.
- Protect automated Continue, multiple-tab coordination, disabled-monitoring preferences and conservative page reload.
- Harden packaging, narrow manifest access, privacy and release checks.
- Maintain Firefox Android experimental and Tampermonkey legacy target labels.

See `docs/V2.8_RELEASE_NOTES.md` for details and limitations.
