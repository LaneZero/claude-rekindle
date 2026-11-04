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

// Regression: a disappeared DOM button must not keep another tab blocked.
test('a released claim permits another tab to resume the same conversation', async () => {
  const store = {};
  let handler;
  const chrome = {
    storage:{local:{get:async key=>({[key]:store[key]}),set:async values=>Object.assign(store,values)}},
    runtime:{onMessage:{addListener(fn){handler=fn}}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener(){}}},
    notifications:{create:async()=>{},clear:async()=>{},onClicked:{addListener(){}}},
    tabs:{create:async()=>{}},
  };
  chrome.runtime.onStartup={addListener(){}};
  chrome.runtime.onInstalled={addListener(){}};
  vm.runInNewContext(fs.readFileSync('src/extension/background.js','utf8'),
    {chrome,URL,Date,Number,Object,Promise,console,Math});
  const senderA={tab:{id:1,url:'https://claude.ai/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}};
  const senderB={tab:{id:2,url:senderA.tab.url}};
  const call=(req,sender)=>new Promise(resolve=>handler(req,sender,resolve));
  const first=await call({type:'claimResume',reason:'ended_early'},senderA);
  assert.equal(first.granted,true);
  assert.equal(typeof first.token,'string');
  assert.equal((await call({type:'releaseResume',reason:'ended_early',token:'wrong'},senderB)).released,false);
  assert.equal((await call({type:'claimResume',reason:'ended_early'},senderB)).granted,false);
  assert.equal((await call({type:'releaseResume',reason:'ended_early',token:first.token},senderA)).released,true);
  assert.equal((await call({type:'claimResume',reason:'ended_early'},senderB)).granted,true);
});

test('claim cannot be released from an unrelated conversation', async () => {
  const store = {};
  let handler;
  const chrome = {
    storage:{local:{get:async key=>({[key]:store[key]}),set:async values=>Object.assign(store,values)}},
    runtime:{onMessage:{addListener(fn){handler=fn}}},
    alarms:{create:async()=>{},clear:async()=>{},onAlarm:{addListener(){}}},
    notifications:{create:async()=>{},clear:async()=>{},onClicked:{addListener(){}}},
    tabs:{create:async()=>{}}
  };
  chrome.runtime.onStartup={addListener(){}};
  chrome.runtime.onInstalled={addListener(){}};
  vm.runInNewContext(fs.readFileSync('src/extension/background.js','utf8'),
    {chrome,URL,Date,Number,Object,Promise,console,Math});
  const a={tab:{id:1,url:'https://claude.ai/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}};
  const b={tab:{id:2,url:'https://claude.ai/chat/ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee'}};
  const call=(req,sender)=>new Promise(resolve=>handler(req,sender,resolve));
  const claim=await call({type:'claimResume',reason:'usage_limit'},a);
  assert.equal((await call({type:'releaseResume',reason:'usage_limit',token:claim.token},b)).released,false);
  assert.equal((await call({type:'claimResume',reason:'usage_limit'},a)).granted,false);
});
