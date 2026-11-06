const { test } = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const fs = name => readFileSync(name, 'utf8');
const content = fs('src/extension/content.js');
const userscript = fs('src/userscript.user.js');
const popup = fs('src/extension/popup.html');
const popupJs = fs('src/extension/popup.js');

test('settings UI provides supported intervals and an opt-in reload toggle', () => {
  assert.match(popup, /id="page-settings"/);
  for (const n of [1,2,5,10,15]) assert.match(popup, new RegExp(`value="${n}"`));
  assert.match(popup, /id="safe-reload"/);
  assert.match(popupJs, /query\('setSettings'/);
});
test('both engines fail closed on reload and protect drafts and pending responses', () => {
  for(const src of [content, userscript]) {
    assert.match(src, /safeReload: false/);
    assert.match(src, /MAX_SAFE_RELOADS = 3/);
    assert.match(src, /!hardLimit \|\| found \|\| state\.pending \|\| hasUnsentDraft\(\)/);
    assert.match(src, /schedule\.at > now/);
    assert.match(src, /MutationObserver/);
    assert.match(src, /EARLY_COOLDOWN_MS/);
  }
});
test('settings are validated and saved to existing migration-compatible keys', () => {
  assert.match(content, /VALID_INTERVALS\.includes\(minutes\)/);
  assert.match(content, /typeof request\.safeReload !== 'boolean'/);
  assert.match(content, /nextPeriodicCheck = Date\.now\(\) \+ minutes \* 60_000/);
  assert.match(content, /lanezero:claude-autoresume:v2:/);
});
