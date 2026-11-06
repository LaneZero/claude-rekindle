'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
function harness() {
  const store={}, notifications=[],listeners={};
  const chrome={
    storage:{local:{async get(key){return {[key]:store[key]}},async set(values){Object.assign(store,values)}}},
    runtime:{onMessage:{addListener(f){listeners.message=f}},onStartup:{addListener(){}},onInstalled:{addListener(){}}},
    alarms:{async create(){},async clear(){return true},onAlarm:{addListener(){}}},
    notifications:{async create(id){notifications.push(id);return id},async clear(){return true},onClicked:{addListener(){}}},
    tabs:{async create(){}}
  };
  vm.runInNewContext(readFileSync('src/extension/background.js','utf8'),{chrome,URL,Date,Promise,Object,Number,Math,console,encodeURIComponent,decodeURIComponent});
  const send=(request,url='https://claude.ai/new')=>new Promise(resolve=>listeners.message(request,{tab:{url,id:1}},resolve));
  return {store,notifications,send};
}
test('disabled monitoring suppresses a scheduled notification and prevents later replay',async()=>{
  const h=harness();
  assert.equal((await h.send({type:'setNotificationsEnabled',enabled:false})).ok,true);
  assert.equal((await h.send({type:'scheduleReset',scope:'site',url:'https://claude.ai/new',at:Date.now()-5000})).ok,true);
  // Drain async delivery queue by submitting a follow-up serialized write.
  assert.equal((await h.send({type:'setNotificationsEnabled',enabled:true})).ok,true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.notifications.length,0);
  assert.equal(h.store['lanezero.autoresume.resetSchedules']['/__site_quota__'].notified,true);
});
test('notification setting cannot be changed by non-Claude senders or malformed messages',async()=>{
  const h=harness();
  assert.equal((await h.send({type:'setNotificationsEnabled',enabled:false},'https://other.example/new')).ok,false);
  assert.equal((await h.send({type:'setNotificationsEnabled',enabled:'false'})).ok,false);
});
