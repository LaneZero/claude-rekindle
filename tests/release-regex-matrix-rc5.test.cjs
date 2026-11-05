'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core/detection.js');
const local = (y,m,d,h,min=0) => new Date(y,m,d,h,min).getTime();

test('hard quota format matrix matches actual composer notices without becoming a Continue action', () => {
  const texts = [
    'You are out of free messages until 10:20 PM',
    'You are out of free messages until tomorrow at 1:10 AM',
    'You are out of free messages until Nov 5 at 1:10 AM',
    'You are out of free usage until 10:20 PM',
    'You are out of free messages until 10:20 PMUpgrade'
  ];
  for (const message of texts) {
    assert.equal(core.HARD_LIMIT.test(message), true, message);
    assert.equal(core.classify(message), null, message);
  }
});

test('hard quota never matches merely a percentage warning or marketing links', () => {
  for (const message of ['Upgrade', 'Your free usage returns', 'Over 95% of your 5-hour limit used · Resets at 10:20 PM', 'You are out of free messages until 19:20 PM']) {
    if (message.includes('19:20')) {
      assert.equal(core.resetTimestamp(message, Date.now()), null);
    } else {
      assert.equal(core.HARD_LIMIT.test(message), false);
    }
  }
});

test('clock-only reset at 10:20 PM remains passed after 10:30 PM (not tomorrow)', () => {
  const at = core.resetTimestamp('You are out of free messages until 10:20 PM', local(2026,10,5,22,30));
  assert.equal(at, local(2026,10,5,22,20));
  assert.match(core.remainingText(at, local(2026,10,5,22,30)), /not confirmed/);
});

test('clock-only 1:10 AM from 10 PM correctly rolls to next local calendar day', () => {
  assert.equal(core.resetTimestamp('You are out of free messages until 1:10 AM', local(2026,10,4,22,0)), local(2026,10,5,1,10));
});

test('late-visible old banner does not re-arm the next day at the same PM hour', () => {
  const text='You are out of free messages until 10:20 PM';
  const before=local(2026,10,5,22,15);
  const at=core.resetTimestamp(text,before);
  assert.equal(core.resetTimestamp(text,local(2026,10,5,22,45),at),at);
});

test('exact dated reset stays in past after deadline', () => {
  assert.equal(core.resetTimestamp('Paused: Your free usage returns Nov 5 at 1:10 AM. Continue then.', local(2026,10,5,14,0)),local(2026,10,5,1,10));
});

test('month/year transition accepts next January but rejects impossible calendar days', () => {
  const at = core.resetTimestamp('Paused: Your free usage returns Jan 1 at 1:10 AM. Continue then.', local(2026,11,31,20,0));
  assert.equal(at,local(2027,0,1,1,10));
  assert.equal(core.resetTimestamp('You are out of free messages until Feb 30 at 1:10 AM',local(2026,1,1,10,0)),null);
});

test('action detection supports missing role attribute but never clicks composer Upgrade', () => {
  const button={textContent:'Continue'};
  const warning={textContent:'This response ended early.',querySelectorAll:() => [button]};
  let selector;
  const root={querySelectorAll(s){selector=s;return [warning]}};
  assert.equal(core.findActionBanner(root).button,button);
  assert.equal(selector,'[data-testid="message-warning"]');
  assert.equal(core.findActionBanner({querySelectorAll:() => []}),null);
});

test('hidden accessibility description is excluded from visible quota text', () => {
  const raw='You are out of free messages(opens in new tab) until 10:20 PMUpgrade';
  const readable=core.bannerVisibleText({innerText:'You are out of free messages until 10:20 PM\nUpgrade',textContent:raw});
  assert.equal(core.HARD_LIMIT.test(readable),true);
  assert.equal(core.HARD_LIMIT.test(raw),false);
});
