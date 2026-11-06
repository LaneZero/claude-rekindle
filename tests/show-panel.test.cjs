const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const popup = readFileSync('src/extension/popup.js', 'utf8');
const page = readFileSync('src/extension/content.js', 'utf8');
const userScript = readFileSync('src/userscript.user.js', 'utf8');
test('Show locates a Claude tab, activates it and closes the popup only on confirmation', () => {
  assert.match(popup, /tabs\.query\(\{url:'https:\/\/claude\.ai\/\*'\}\)/);
  assert.match(popup, /tabs\.update\(candidate\.id,\{active:true\}\)/);
  assert.match(popup, /result\?\.ok && result\.visible/);
  assert.match(popup, /window\.close\(\)/);
});
test('Show has visible failure feedback instead of silently doing nothing', () => {
  assert.match(popup, /report\(`Show failed:/);
  assert.match(readFileSync('src/extension/popup.html','utf8'), /id="action-feedback"/);
});
test('Page and userscript panels can be reopened and override page-wide display CSS', () => {
  for (const source of [page, userScript]) {
    assert.match(source, /setProperty\('display', displayValue, 'important'\)/);
    assert.match(source, /document\.documentElement\.append\(panel\)/);
  }
  assert.match(page, /visible: panelVisible && panel\.isConnected/);
});
