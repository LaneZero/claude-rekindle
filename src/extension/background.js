// ClaudeRekindle by LaneZero: reminders persist in browser storage.
// Does not access cookies, chat content, or Claude APIs.
const KEY = 'lanezero.autoresume.resetSchedules';
const ALARM_PREFIX = 'claude-reset:';
const NOTIF_PREFIX = 'claude-reset-notification:';
const CLAIM_KEY = 'lanezero.rekindle.resumeClaims.v1';
const CLAIM_TTL_MS = 60 * 60_000;
let claimQueue = Promise.resolve();
// Serialize read/modify/write operations across tabs, including simultaneous warnings.
function claimResume(sender, reason) {
  const operation = claimQueue.then(async () => {
    if (!validUrl(sender.tab?.url || '') || !['usage_limit', 'ended_early'].includes(reason))
      return {granted:false};
    const id = idFor(sender.tab.url);
    const now = Date.now();
    const stored = (await chrome.storage.local.get(CLAIM_KEY))[CLAIM_KEY] || {};
    const recent = Object.fromEntries(Object.entries(stored).filter(([, item]) =>
      item && Number.isFinite(item.at) && now - item.at < CLAIM_TTL_MS && now >= item.at));
    const key = id + ':' + reason;
    const prior = recent[key];
    const cooldown = reason === 'ended_early' ? 15000 : 600000;
    // A persistent per-conversation budget prevents automatic endless retry loops.
    if (prior && (now - prior.at < cooldown ||
        (reason === 'ended_early' && prior.count >= 3))) return {granted:false};
    const token = `${sender.tab.id ?? 'unknown'}:${now}:${Math.random().toString(36).slice(2)}`;
    recent[key] = {at:now, count: prior ? prior.count+1 : 1, token};
    await chrome.storage.local.set({[CLAIM_KEY]:recent});
    return {granted:true, token};
  });
  claimQueue = operation.catch(() => {});
  return operation;
}
// Release only a claim whose button was never clicked. A token and the same
// conversation URL are required, so another tab cannot clear a peer's claim.
function releaseClaim(sender, reason, token) {
  const operation = claimQueue.then(async () => {
    if (!validUrl(sender.tab?.url || '') || !['usage_limit', 'ended_early'].includes(reason) ||
        typeof token !== 'string' || !token) return {released:false};
    const stored = (await chrome.storage.local.get(CLAIM_KEY))[CLAIM_KEY] || {};
    const key = idFor(sender.tab.url) + ':' + reason;
    if (stored[key]?.token !== token) return {released:false};
    delete stored[key];
    await chrome.storage.local.set({[CLAIM_KEY]:stored});
    return {released:true};
  });
  claimQueue = operation.catch(() => {});
  return operation;
}
const getSchedules = async () => (await chrome.storage.local.get(KEY))[KEY] || {};
const saveSchedules = async schedules => chrome.storage.local.set({ [KEY]: schedules });
const alarmName = id => ALARM_PREFIX + id;
function idFor(url) { return new URL(url).pathname; }
function validUrl(url) {
  try { const u = new URL(url); return u.origin === 'https://claude.ai' && /^\/chat\//.test(u.pathname); }
  catch { return false; }
}
async function remindDue() {
  const schedules = await getSchedules();
  const now = Date.now();
  let dirty = false;
  for (const [id, item] of Object.entries(schedules)) {
    if (item.resolved || item.notified || !Number.isFinite(item.at) || item.at > now) continue;
    const notificationId = NOTIF_PREFIX + encodeURIComponent(id);
    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic', iconUrl: 'icons/icon128.png', title: 'ClaudeRekindle · LaneZero',
        message: item.reason === 'near_limit' ? 'The announced 5-hour reset time has passed. Check Claude if needed; the warning alone does not mean you were paused.' : 'Claude’s scheduled reset time has passed. Open your paused chat to check Continue.',
        priority: 1
      });
      item.notified = true;
      dirty = true;
    } catch (err) { console.warn('AutoResume notification failed:', err); }
  }
  if (dirty) await saveSchedules(schedules);
}
async function restoreAlarms() {
  const schedules = await getSchedules();
  for (const [id, item] of Object.entries(schedules)) {
    if (item.resolved || item.notified || !Number.isFinite(item.at)) continue;
    if (item.at > Date.now()) await chrome.alarms.create(alarmName(id), { when: item.at });
  }
  await remindDue();
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type === 'claimResume') {
    claimResume(sender, request.reason).then(sendResponse).catch(() => sendResponse({granted:false}));
    return true;
  }
  if (request?.type === 'releaseResume') {
    releaseClaim(sender, request.reason, request.token).then(sendResponse)
      .catch(() => sendResponse({released:false}));
    return true;
  }
  if (!['scheduleReset','resolveReset'].includes(request?.type)) return;
  (async () => {
    if (!sender.tab?.url || !validUrl(sender.tab.url) || !validUrl(request.url) ||
        idFor(sender.tab.url) !== idFor(request.url)) return;
    const id = idFor(request.url);
    const schedules = await getSchedules();
    if (request.type === 'resolveReset') {
      if (schedules[id]) schedules[id].resolved = true;
      await chrome.alarms.clear(alarmName(id));
    } else {
      const at = Number(request.at);
      if (!Number.isFinite(at) || at < Date.now() - 24*60*60*1000 || at > Date.now()+48*60*60*1000) return;
      const reason = request.reason === 'near_limit' ? 'near_limit' : 'usage_limit';
      // Do not downgrade an existing paused conversation to an informational warning.
      if (!(schedules[id]?.reason === 'usage_limit' && reason === 'near_limit' && !schedules[id].resolved)) {
        if (schedules[id]?.at !== at || schedules[id]?.reason !== reason) schedules[id] = { url: request.url, at, reason, resolved:false, notified:false };
      }
      if (schedules[id]?.at > Date.now()) await chrome.alarms.create(alarmName(id), { when: schedules[id].at });
    }
    // Bound storage: latest 50 schedule entries.
    for (const obsolete of Object.keys(schedules).sort((a,b)=>schedules[b].at-schedules[a].at).slice(50)) delete schedules[obsolete];
    await saveSchedules(schedules);
  })().then(() => sendResponse({ok:true})).catch(() => sendResponse({ok:false}));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name.startsWith(ALARM_PREFIX)) void remindDue(); });
chrome.runtime.onStartup.addListener(() => { void restoreAlarms(); });
chrome.runtime.onInstalled.addListener(() => { void restoreAlarms(); });
chrome.notifications.onClicked.addListener(id => {
  if (!id.startsWith(NOTIF_PREFIX)) return;
  const pathname = decodeURIComponent(id.slice(NOTIF_PREFIX.length));
  const url = 'https://claude.ai' + pathname;
  if (validUrl(url)) void chrome.tabs.create({url});
  void chrome.notifications.clear(id);
});
// Service-worker restarts may discard alarms; recover them when the worker loads.
void restoreAlarms();
