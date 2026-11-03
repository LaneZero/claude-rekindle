const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('both extensions expose the new brand', () => {
  for (const browser of ['chrome', 'firefox']) {
    const manifest = JSON.parse(fs.readFileSync(path.join('config', `manifest.${browser}.json`), 'utf8'));
    assert.equal(manifest.name, 'ClaudeRekindle by LaneZero');
    assert.equal(manifest.action.default_title, 'ClaudeRekindle');
  }
});

test('Tampermonkey metadata uses ClaudeRekindle', () => {
  const text = fs.readFileSync('src/userscript.user.js', 'utf8');
  assert.match(text, /@name\s+ClaudeRekindle by LaneZero/);
  assert.match(text, /@version\s+2\.6\.1-beta\.1/);
});
