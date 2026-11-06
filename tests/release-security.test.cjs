'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function mockBackground() {
  const store = {};
  const listeners = {};
  const alarms = [];
  const chrome = {
    storage: {local: {
      async get(k) { return {[k]: store[k]}; },
      async set(obj) { Object.assign(store, obj); }
    }},
    runtime: {
      onMessage: {addListener(fn) { listeners.message = fn; }},
      onStartup: {addListener() {}},
      onInstalled: {addListener() {}}
    },
    alarms: {
      async create(name, options) { alarms.push({name,options}); },
      async clear() { return true; },
      onAlarm: {addListener(fn) { listeners.alarm = fn; }}
    },
    notifications: {
      async create() { return 'id'; },
      async clear() { return true; },
      onClicked: {addListener(fn) { listeners.click = fn; }}
    },
    tabs: {async create({url}) { listeners.opened = url; }}
  };
  vm.runInNewContext(fs.readFileSync('src/extension/background.js','utf8'),
    {chrome, URL, Date, Promise, Object, Number, Math, console, encodeURIComponent, decodeURIComponent});
  const send = (request, url) => new Promise(resolve => listeners.message(request,{tab:{url,id:1}},resolve));
  return {send,store,alarms,listeners};
}

test('parallel reset announcements retain both conversations', async () => {
  const m = mockBackground();
  const now = Date.now() + 60_000;
  const a = 'https://claude.ai/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const b = 'https://claude.ai/chat/bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const results = await Promise.all([
    m.send({type:'scheduleReset',url:a,at:now,reason:'usage_limit'},a),
    m.send({type:'scheduleReset',url:b,at:now+10_000,reason:'near_limit'},b)
  ]);
  assert.deepEqual(results.map(x=>x.ok),[true,true]);
  const schedules = m.store['lanezero.autoresume.resetSchedules'];
  assert.equal(Object.keys(schedules).length,2);
  assert.equal(schedules[new URL(a).pathname].at,now);
  assert.equal(schedules[new URL(b).pathname].reason,'near_limit');
});

test('schedule requests from another origin, mismatched path, and invalid time are rejected', async () => {
  const m = mockBackground();
  const a = 'https://claude.ai/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const b = 'https://claude.ai/chat/bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const at = Date.now() + 60_000;
  assert.equal((await m.send({type:'scheduleReset',url:a,at},'https://evil.example/chat/x')).ok,false);
  assert.equal((await m.send({type:'scheduleReset',url:b,at},a)).ok,false);
  assert.equal((await m.send({type:'scheduleReset',url:a,at:'NaN'},a)).ok,false);
  assert.equal(m.store['lanezero.autoresume.resetSchedules'],undefined);
});

test('malformed notification IDs do not open a tab or crash', async () => {
  const m = mockBackground();
  m.listeners.click('claude-reset-notification:%ZZ');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(m.listeners.opened,undefined);
});

test('manifest scope is minimal and release output is ignored', () => {
  const ignore = fs.readFileSync('.gitignore','utf8');
  for (const name of ['/release/','/dist/','/node_modules/']) assert.ok(ignore.split(/\r?\n/).includes(name));
  for (const browser of ['chrome','firefox']) {
    const m = JSON.parse(fs.readFileSync(`config/manifest.${browser}.json`,'utf8'));
    assert.deepEqual(m.host_permissions,['https://claude.ai/*']);
    assert.deepEqual([...m.permissions].sort(),['alarms','notifications','storage','tabs']);
  }
});
