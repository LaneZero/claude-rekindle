const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const content = fs.readFileSync('src/extension/content.js','utf8');
const generated = fs.readFileSync('src/userscript.user.js','utf8');
const core = fs.readFileSync('src/core/detection.js','utf8');
test('userscript embeds shared detection engine', () => {
  assert.ok(generated.includes(core.trim()));
  assert.ok(generated.includes('const IS_BROWSER_ADDON = false;'));
  assert.ok(generated.includes('const IS_EXTENSION = false;'));
  assert.ok(generated.includes('GM_registerMenuCommand'));
});
test('shared content still sends requests only for browser extensions', () => {
  assert.match(content,/if \(!IS_BROWSER_ADDON && typeof GM_registerMenuCommand/);
  assert.match(content,/if \(!IS_EXTENSION\) return \{granted:true, token:null\}/);
});
test('mutation observer filters its own panel', () => {
  assert.match(content,/const panelMutation = node =>/);
  assert.match(content,/if \(panelMutation\(record.target\)\) return false/);
  assert.match(content,/if \(!externalChange\) return/);
});
