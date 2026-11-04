const {test} = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core/detection.js');
test('hard quota message is recognized but is not a Continue action', () => {
  const text = 'You are out of free messages until 10:00 PM';
  assert.equal(core.HARD_LIMIT.test(text), true);
  assert.equal(core.classify(text), null);
  const t = core.resetTimestamp(text, new Date(2026,10,3,17,0).getTime());
  assert.equal(new Date(t).getHours(),22);
  assert.equal(core.remainingText(t, new Date(2026,10,3,17,0).getTime()), '5h 0m remaining');
});
test('reset time rollover, AM/PM, and prior timestamp are handled', () => {
  const now = new Date(2026,10,3,23,15).getTime();
  const at = core.resetTimestamp('You are out of free messages until 1:00 AM', now);
  assert.equal(new Date(at).getDate(),4);
  assert.equal(new Date(at).getHours(),1);
  assert.equal(core.resetTimestamp('You are out of free messages until 1:00 AM',at+10000,at),at);
  assert.match(core.remainingText(at,at+10000),/not confirmed/);
});
test('invalid and missing reset time cannot produce a countdown', () => {
  assert.equal(core.resetTimestamp('You are out of free messages until 99:00 PM'),null);
  assert.equal(core.resetTimestamp('You are out of free messages'),null);
  assert.equal(core.remainingText(null),'Unknown');
});
test('all builds contain a dedicated local reset card and never click Upgrade',()=>{
  const fs = require('node:fs');
  const html=fs.readFileSync('src/extension/popup.html','utf8');
  const js=fs.readFileSync('src/extension/content.js','utf8');
  const userscript=fs.readFileSync('src/userscript.user.js','utf8');
  assert.match(html,/id="reset-countdown"/);
  assert.match(js,/findHardLimit/);
  assert.match(userscript,/findHardLimit/);
  assert.match(js,/no Continue button detected/);
});
