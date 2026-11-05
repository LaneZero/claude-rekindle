'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const store = {}, alarms = [], notifications = [], listeners = {};
  const chrome = {
    storage:{local:{async get(k){return {[k]:store[k]}},async set(x){Object.assign(store,x)}}},
    runtime:{onMessage:{addListener(f){listeners.message=f}},onStartup:{addListener(){}},onInstalled:{addListener(){}}},
    alarms:{async create(id,o){alarms.push({id,...o})},async clear(){return true},onAlarm:{addListener(f){listeners.alarm=f}}},
    notifications:{async create(id,details){notifications.push({id,details});return id},async clear(){return true},onClicked:{addListener(f){listeners.click=f}}},
    tabs:{async create({url}){listeners.opened=url}}
  };
  vm.runInNewContext(fs.readFileSync('src/extension/background.js','utf8'),{chrome,URL,Date,Promise,Object,Number,Math,console,encodeURIComponent,decodeURIComponent});
  const send=(request,url='https://claude.ai/new')=>new Promise(resolve=>listeners.message(request,{tab:{url,id:1}},resolve));
  const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
  return {store,alarms,notifications,listeners,send,flush};
}
test('composer quota on /new schedules a site-wide reminder without Continue',async()=>{
 const h=harness(), at=Date.now()+60_000;
 assert.equal((await h.send({type:'scheduleReset',url:'https://claude.ai/new',scope:'site',reason:'usage_limit',at})).ok,true);
 assert.equal(h.store['lanezero.autoresume.resetSchedules']['/__site_quota__'].at,at);
 assert.ok(h.alarms.some(a=>a.when===at));
 const status=await h.send({type:'getSiteReset'});
 assert.equal(status.at,at);
});
test('site reminder fires once after deadline and opens /new on click',async()=>{
 const h=harness(), at=Date.now()-3_000;
 await h.send({type:'scheduleReset',url:'https://claude.ai/new',scope:'site',reason:'usage_limit',at});
 await h.flush();
 assert.equal(h.notifications.length,1);
 assert.match(h.notifications[0].details.message,/time has arrived/i);
 assert.match(h.notifications[0].details.message,/not guaranteed/i);
 h.listeners.alarm({name:'claude-reset:/__site_quota__'});
 await h.flush();
 assert.equal(h.notifications.length,1);
 h.listeners.click(h.notifications[0].id);
 await h.flush();
 assert.equal(h.listeners.opened,'https://claude.ai/new');
});
test('site quota cannot be forged by foreign origins or mismatched paths',async()=>{
 const h=harness(), at=Date.now()+60_000;
 assert.equal((await h.send({type:'scheduleReset',url:'https://claude.ai/new',scope:'site',at},'https://evil.example/new')).ok,false);
 assert.equal((await h.send({type:'scheduleReset',url:'https://claude.ai/new',scope:'site',at},'https://claude.ai/chat/different')).ok,false);
 assert.equal((await h.send({type:'scheduleReset',url:'https://claude.ai/new',at})).ok,false);
});
test('popup retains site-wide countdown when there is no Claude chat tab',()=>{
 const popup=fs.readFileSync('src/extension/popup.js','utf8');
 assert.match(popup,/getSiteReset/);
 assert.match(popup,/resetAt = siteResetAt/);
 assert.doesNotMatch(popup,/tabId=null;resetAt=null;updateCountdown/);
 const content=fs.readFileSync('src/extension/content.js','utf8');
 assert.match(content,/rememberReset\(hardAt, 'usage_limit', 'site'\)/);
 assert.match(content,/const global = reminders\[SITE_QUOTA_ID\]/);
});
