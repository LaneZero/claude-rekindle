const {test} = require('node:test');
const assert = require('node:assert/strict');
const core=require('../src/core/detection.js');
test('early interruption can be distinguished from quota pause',()=>{
 assert.equal(core.classify('This response ended early.'),'ended_early');
 assert.equal(core.classify('Paused when your free usage ran out. Continue to pick up where Claude stopped.'),'usage_limit');
 assert.equal(core.classify('Paused: Your free usage returns at 4:30 AM. Continue then.'),'usage_limit');
 assert.equal(core.classify('Upgrade to Pro'),null);
});
test('advisory percentage varies and never counts as a pause',()=>{
 for(const percent of [50,75,90,95,99,100]) {
  const value=`Over ${percent}% of your 5-hour limit used · Resets at 5:00 PM`;
  assert.equal(core.advisory(value).percent,percent);
  assert.equal(core.classify(value),null);
 }
 assert.equal(core.advisory('Over 120% of your 5-hour limit used · Resets at 5:00 PM'),null);
});
test('reset clock parses AM/PM and rejects invalid values',()=>{
 const now=new Date(2026,10,3,14,0,0).getTime();
 const at=core.resetTimestamp('Resets at 5:00 PM',now);
 assert.equal(new Date(at).getHours(),17);
 assert.equal(core.resetTimestamp('Resets at 13:70 PM',now),null);
 assert.equal(core.resetTimestamp('Your free usage returns at 4:30 AM',now) > now,true);
});
test('previous reset is reused after restart instead of drifting to tomorrow',()=>{
 const at=new Date(2026,10,3,17,0,0).getTime();
 assert.equal(core.resetTimestamp('Resets at 5:00 PM',at+300000,at),at);
});
