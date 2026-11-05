# ClaudeRekindle v2.8.0 Stable — Publication gates

- [x] RC5 user confirmed working in tested browsers (individual device matrix not supplied)
- [x] RC5 automated regression baseline; rerun `npm run release:check` for Stable
- [x] Manifest, popup and userscript version consistency
- [x] Restricted host permissions and local-only behavior checks
- [x] `.gitignore` excludes `dist/`, `release/`, secrets and local dependencies
- [x] Release archives and SHA-256 integrity
- [ ] Verify tagged commit matches packaged source before publishing
- [ ] Record Chrome and Firefox Desktop browser versions and exact notification test results
- [ ] Obtain real-device Firefox Android QA before changing Experimental label
- [ ] Obtain marketplace signing/approval for store installation
- [ ] Create and verify GitHub Release and upload archives (manual operation)

**Distribution status:** Stable *source* archive and locally-installable desktop builds; not a signed browser-store release. Firefox Android and Tampermonkey remain experimental/legacy.
