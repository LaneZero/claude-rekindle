# ClaudeRekindle release checklist (v2.8.0 RC2)

- [x] Build the Chrome, Firefox, and Tampermonkey variants.
- [x] Pass the automated unit/regression and static release preflight checks.
- [x] Verify host scope, permissions, icon assets and README/privacy documentation.
- [x] Exclude build and release outputs from Git source tracking.
- [x] Produce checksummed, reproducible ZIP archives.
- [ ] Record manual Chrome desktop runtime QA results.
- [ ] Record manual Firefox desktop runtime QA results.
- [ ] Record manual Firefox Android runtime QA results.
- [ ] Confirm popup, About icon, donations and accessible navigation on device.
- [ ] Test quota pause, ended early, early success and reset-time-passed behavior.
- [ ] Test cross-tab concurrency and browser-close/reopen reminders.
- [ ] Verify browser-store policy and sign distributable packages.
- [ ] Open a Pull Request to develop, wait for CI, review and merge.
- [ ] Create tag `v2.8.0-rc.2` only from reviewed and merged commit.
- [ ] Upload platform ZIPs and SHA256SUMS.txt as a GitHub **pre-release**.

See `docs/RC2_SECURITY_QA.md` for the risk/verification breakdown.
