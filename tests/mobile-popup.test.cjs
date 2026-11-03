const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const html = readFileSync('src/extension/popup.html', 'utf8');
const js = readFileSync('src/extension/popup.js', 'utf8');
const css = readFileSync('src/extension/popup.css', 'utf8');

test('all mobile controls exist and have click handlers', () => {
  for(const id of ['show','open-claude','refresh-status']) {
    assert.match(html,new RegExp(`id="${id}"`));
    assert.ok(js.includes(`$('${id}').addEventListener('click'`));
  }
});
test('mobile window focus is optional and never blocks Show', () => {
  assert.match(js,/chrome\.windows\?\.update/);
  assert.match(js,/catch \{ \/\* The tab is already activated/);
  assert.match(js,/result\?\.ok && result\.visible/);
});
test('popup reserves intrinsic width and controls remain touch sized', () => {
  // Popup document must retain its own intrinsic width in Firefox/Chromium.
  assert.match(css,/html\{width:370px;min-width:370px/);
  assert.match(css,/body\{width:370px;min-width:370px;max-width:none/);
  assert.doesNotMatch(css,/max-width:100vw/);
  assert.doesNotMatch(css,/body\{min-width:0;width:370px/);
  assert.match(css,/min-height:44px;touch-action:manipulation/);
  assert.match(css,/@media\(max-width:360px\)/);
});
test('read existing Claude tab when another tab is active without switching tabs', () => {
  assert.match(js,/let target = tab && isClaude\(tab\.url\) \? tab : null/);
  assert.match(js,/target = matches\.find/);
  assert.match(js,/tabId=target\.id/);
});
