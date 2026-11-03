const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Simulate two Chrome/Firefox content scripts racing to claim the same chat.
test('background grants only one concurrent claim for the same chat', async () => {
  const store = {};
  let handler;
  const chrome = {
    storage:{local:{get:async k=>({[k]:store[k]}),set:async value=>Object.assign(store,value)}},
    runtime:{onMessage:{addListener(fn){handler=fn}}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener(){}}},
    notifications:{create:async()=>{},clear:async()=>{},onClicked:{addListener(){}}},
    tabs:{create:async()=>{}},
  };
  chrome.runtime.onStartup={addListener(){}};
  chrome.runtime.onInstalled={addListener(){}};
  const code = fs.readFileSync('src/extension/background.js','utf8');
  vm.runInNewContext(code,{chrome,URL,Date,Number,Object,Promise,console});
  const sender={tab:{url:'https://claude.ai/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}};
  const request={type:'claimResume',reason:'ended_early'};
  const ask=()=>new Promise(resolve=>handler(request,sender,resolve));
  const [a,b]=await Promise.all([ask(),ask()]);
  assert.equal([a.granted,b.granted].filter(Boolean).length,1);
  assert.equal((await ask()).granted,false);
  assert.equal((await new Promise(resolve=>handler({...request,reason:'usage_limit'},sender,resolve))).granted,true);
  assert.equal((await new Promise(resolve=>handler(request,{tab:{url:'https://evil.invalid/chat/x'}},resolve))).granted,false);
});
