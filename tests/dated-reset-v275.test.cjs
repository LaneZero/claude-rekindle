'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync,existsSync} = require('node:fs');
const core = require('../src/core/detection.js');
const local = (year,month,day,hour,minute=0) => new Date(year,month,day,hour,minute).getTime();

test('Nov 5 timed pause is classified and countdown is computed from exact date', () => {
  const now = local(2026,10,4,20,43);
  const message = 'Paused: Your free usage returns Nov 5 at 1:10 AM. Continue then.';
  assert.equal(core.classify(message),'usage_limit');
  assert.equal(core.TIMED.test(message),true);
  const expected = local(2026,10,5,1,10);
  assert.equal(core.resetTimestamp(message,now),expected);
  assert.equal(core.remainingText(expected,now),'4h 27m remaining');
  assert.match(core.remainingText(expected,expected + 1000),/not confirmed/);
});

test('tomorrow hard quota notice is recognized without becoming a Continue action',()=>{
  const now=local(2026,10,4,20,43);
  const message='You are out of free messages until tomorrow at 1:10 AM';
  assert.equal(core.HARD_LIMIT.test(message),true);
  assert.equal(core.classify(message),null);
  const at=core.resetTimestamp(message,now);
  assert.equal(at,local(2026,10,5,1,10));
  assert.equal(core.resetTimestamp(message,local(2026,10,5,0,30),at),at);
  assert.equal(core.resetTimestamp(message,at+60000,at),at);
});

test('explicit past calendar date does not silently roll over to tomorrow',()=>{
  const now=local(2026,10,5,2,0);
  const text='Paused: Your free usage returns Nov 5 at 1:10 AM. Continue then.';
  const at=core.resetTimestamp(text,now);
  assert.equal(at,local(2026,10,5,1,10));
  assert.match(core.remainingText(at,now),/not confirmed/);
});

test('reject impossible dates/times and preserve early-ended mode',()=>{
  const now=local(2026,10,4,20,43);
  assert.equal(core.resetTimestamp('Paused: Your free usage returns Nov 31 at 1:10 AM.',now),null);
  assert.equal(core.resetTimestamp('Paused: Your free usage returns Nov 5 at 13:10 AM.',now),null);
  assert.equal(core.classify('This response ended early.'),'ended_early');
});

test('both extension packages include the About icon with runtime URLs',()=>{
  const build=readFileSync('scripts/build.mjs','utf8');
  const popup=readFileSync('src/extension/popup.js','utf8');
  assert.match(build,/\[16,32,48,64,96,128,256\]/);
  assert.match(popup,/chrome\.runtime\.getURL/);
  assert.equal(existsSync('assets/icon64.png'),true);
});
