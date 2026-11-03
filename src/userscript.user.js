// ==UserScript==
// @name         ClaudeRekindle by LaneZero
// @namespace    https://github.com/LaneZero
// @version      2.4.0-beta.1
// @author       LaneZero
// @description  Resumes Claude only when an eligible Continue is active. Tracks variable-percentage 5-hour quota warnings and reset times without clicking Upgrade; stores reminders and local history. Independent of Anthropic; never bypasses limits.
// @match        https://claude.ai/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';

  const CHECK_MS = 5000;
  const COOLDOWN_MS = 10 * 60_000;
  const EARLY_COOLDOWN_MS = 15_000;
  const VERIFY_MS = 20_000;
  const PREFIX = 'lanezero:claude-autoresume:v2:';
  const HISTORY_KEY = PREFIX + 'history';
  const RESET_KEY = PREFIX + 'resets';
  const REMINDER_KEY = PREFIX + 'reminder';
  const SETTINGS_KEY = PREFIX + 'settings';
  const PAUSED = /Paused when your free usage ran out\./i;
  const EARLY = /This response ended early\./i;
  const TIMED = /Paused:\s*Your free usage returns at\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i;
  const TIME = /Your free usage returns at\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  // Advisory banner percentage varies; do not hard-code 90%.
  const NEAR_LIMIT = /(?:Over\s*)?(\d{1,3})%\s+of\s+your\s+(?:\d+[- ]hour|\w+)[- ]limit\s+used\s*[·•|–-]\s*Resets\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const MAX_HISTORY = 100;
  const IS_BROWSER_ADDON = false;
  const IS_EXTENSION = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  let lastStatus = 'Monitoring Claude';

  const readJSON = (store, key, fallback) => {
    try { return JSON.parse(store.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  };
  const writeJSON = (store, key, value) => {
    try { store.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
  };
  let settings = readJSON(localStorage, SETTINGS_KEY, { enabled: true, dismissed: false });
  if (typeof settings !== 'object' || !settings) settings = { enabled: true, dismissed: false };
  let path = location.pathname;
  let state = {};
  let panelVisible = false;
  let statusText = '';
  let reminders = readJSON(localStorage, RESET_KEY, {});
  if (!reminders || typeof reminders !== 'object') reminders = {};
  const saveReminders = () => writeJSON(localStorage, RESET_KEY, reminders);
  function notifyExtension(type, payload) {
    if (!IS_BROWSER_ADDON) return;
    try { chrome.runtime.sendMessage({ type, ...payload }, () => { void chrome.runtime.lastError; }); }
    catch { /* Browser extension background may be unavailable. */ }
  }
  function rememberReset(at, reason = 'usage_limit') {
    if (!Number.isFinite(at) || at <= 0) return;
    const id = location.pathname;
    const existing = reminders[id];
    // A usage pause is stronger evidence than an advisory warning.
    if (existing?.at === at && (existing.reason === 'usage_limit' || existing.reason === reason)) return;
    if (existing?.reason === 'usage_limit' && reason === 'near_limit' && !existing.resolved) return;
    reminders[id] = { at, url: location.origin + id, reason, reminded: false, resolved: false };
    // Keep latest 50 conversations only. No chat contents are stored.
    const keys = Object.keys(reminders).sort((a,b) => reminders[b].at-reminders[a].at);
    for (const old of keys.slice(50)) delete reminders[old];
    saveReminders();
    notifyExtension('scheduleReset', { at, reason, url: location.origin + id });
  }
  function resolveReset() {
    const entry = reminders[location.pathname];
    if (!entry || entry.resolved) return;
    entry.resolved = true;
    saveReminders();
    notifyExtension('resolveReset', { url: location.origin + location.pathname });
  }
  function remindInPageIfDue() {
    // Tampermonkey cannot run when the browser is closed. It checks on Claude load.
    if (IS_BROWSER_ADDON) return;
    const entry = reminders[location.pathname];
    if (!entry || entry.resolved || entry.reminded || Date.now() < entry.at) return;
    entry.reminded = true;
    saveReminders();
    if (settings.enabled) {
      openPanel();
      display(entry.reason === 'near_limit'
        ? `Previously announced 5-hour reset time passed (${formatTime(entry.at)}). This does not confirm a pause or quota restoration.`
        : `Scheduled reset time passed (${formatTime(entry.at)}). Checking whether Continue is available…`);
    }
  }


  const stateKey = () => PREFIX + 'conversation:' + location.pathname;
  function loadConversation() {
    path = location.pathname;
    state = readJSON(sessionStorage, stateKey(), {});
    if (!state || typeof state !== 'object') state = {};
  }
  function saveConversation() { writeJSON(sessionStorage, stateKey(), state); }
  function saveSettings() { writeJSON(localStorage, SETTINGS_KEY, settings); }
  function history() { return readJSON(localStorage, HISTORY_KEY, []); }
  function addRecord(record) {
    const entries = history();
    entries.unshift(record);
    writeJSON(localStorage, HISTORY_KEY, entries.slice(0, MAX_HISTORY));
  }
  const formatTime = ms => new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date(ms));

  // Scope selection to Claude's warning. Never click a generic page button.
  function findBanner() {
    for (const banner of document.querySelectorAll('[data-testid="message-warning"][role="status"]')) {
      const content = banner.textContent || '';
      if (!PAUSED.test(content) && !TIMED.test(content) && !EARLY.test(content)) continue;
      const button = [...banner.querySelectorAll('button')].find(el =>
        /^(continue|resume)$/i.test((el.textContent || '').trim()));
      if (button) return { banner, button, content, timed: TIMED.test(content), reason: EARLY.test(content) ? 'ended_early' : 'usage_limit' };
    }
    return null;
  }
  function findNearLimit() {
    // Composer warning has no message-warning test id; never use its Upgrade button.
    for (const banner of document.querySelectorAll('[data-cds="Banner"]')) {
      if (banner.matches('[data-testid="message-warning"]')) continue;
      const text = banner.querySelector('[aria-atomic="true"]')?.textContent || banner.textContent || '';
      const m = NEAR_LIMIT.exec(text);
      if (!m) continue;
      const percent = Number(m[1]);
      if (percent < 0 || percent > 100) continue;
      return { percent, resetText: `${m[2]}:${m[3]} ${m[4]}`, text };
    }
    return null;
  }
  function parseReset(text) {
    const m = /(?:Your free usage returns at|Resets at)\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(text);
    if (!m) return null;
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const previous = reminders[location.pathname];
    // Reuse a recent saved reset across browser restarts instead of rolling it to tomorrow.
    if (previous && Number.isFinite(previous.at) && Date.now() - previous.at < 24*60*60_000) {
      const saved = new Date(previous.at);
      const expectedHour = hour % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0);
      if (saved.getHours() === expectedHour && saved.getMinutes() === minute) return previous.at;
    }
    const date = new Date();
    date.setHours(hour % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0), minute, 0, 0);
    if (date.getTime() < Date.now() - 10 * 60_000) date.setDate(date.getDate() + 1);
    return date.getTime();
  }
  function enabledButton(button) {
    if (!button.isConnected || button.disabled || button.matches(':disabled') ||
      button.getAttribute('aria-disabled') === 'true' || button.closest('[inert]') ||
      button.closest('[data-disabled="true"]')) return false;
    const style = getComputedStyle(button);
    return style.visibility !== 'hidden' && style.display !== 'none' &&
      style.pointerEvents !== 'none' && button.getClientRects().length > 0;
  }

  // UI is separate from automation. Closing the panel never disables monitoring.
  const panel = document.createElement('section');
  panel.id = 'lanezero-rekindle-panel';
  panel.setAttribute('aria-label', 'ClaudeRekindle');
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;box-sizing:border-box;max-width:min(380px,calc(100vw - 32px));width:335px;padding:12px;border-radius:12px;background:#222326;color:#fff;border:1px solid #646464;box-shadow:0 8px 28px #0008;font:12px/1.5 system-ui,sans-serif;direction:ltr;';
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
  const title = document.createElement('strong');
  title.textContent = 'ClaudeRekindle · LaneZero';
  const close = document.createElement('button');
  close.type = 'button';
  close.title = 'Close this panel. ClaudeRekindle keeps monitoring.';
  close.setAttribute('aria-label', 'Close ClaudeRekindle panel');
  close.textContent = '×';
  close.style.cssText = 'background:transparent;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0 3px';
  header.append(title, close);
  const message = document.createElement('div');
  message.style.cssText = 'margin-top:8px;overflow-wrap:anywhere;';
  message.setAttribute('role', 'status');
  const last = document.createElement('div');
  last.style.cssText = 'opacity:.8;font-size:11px;margin-top:6px;overflow-wrap:anywhere';
  const actions = document.createElement('div');
  actions.style.cssText = 'margin-top:10px;display:flex;gap:8px';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.style.cssText = 'background:#3e4148;color:#fff;border:1px solid #777;border-radius:7px;padding:5px 9px;cursor:pointer';
  actions.append(toggle);
  panel.append(header, message, last, actions);

  function render() {
    panel.style.display = panelVisible ? 'block' : 'none';
    if (!panelVisible) return;
    message.textContent = settings.enabled ? statusText : 'ClaudeRekindle disabled';
    toggle.textContent = settings.enabled ? 'Disable' : 'Enable';
    const latest = history()[0];
    last.textContent = latest ? `Last resume: ${formatTime(latest.time)} · ${latest.result}` : 'No resume attempts recorded';
  }
  function openPanel() {
    settings.dismissed = false;
    saveSettings();
    panelVisible = true;
    render();
  }
  close.addEventListener('click', () => {
    settings.dismissed = true;
    saveSettings();
    panelVisible = false;
    render();
  });
  toggle.addEventListener('click', () => {
    settings.enabled = !settings.enabled;
    saveSettings();
    check();
  });
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Show ClaudeRekindle panel', openPanel);
  }
  document.body.append(panel);
  loadConversation();
  panelVisible = !settings.dismissed;

  function display(text) {
    statusText = text;
    lastStatus = text;
    render();
  }
  function completeAttempt(result) {
    if (!state.pending) return;
    const event = { time: state.pending.at, result, reason: state.pending.reason || 'usage_limit', conversation: path };
    state.pending = null;
    saveConversation();
    addRecord(event);
    if (result === 'confirmed') resolveReset();
    // Each new event may show the panel, even when the previous one was dismissed.
    openPanel();
    display(result === 'confirmed'
      ? `${event.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · Continue clicked at ${formatTime(event.time)} · banner cleared`
      : `${event.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · Continue clicked at ${formatTime(event.time)}; result unconfirmed`);
  }

  function check() {
    if (location.pathname !== path) loadConversation();
    if (!settings.enabled) { display('ClaudeRekindle disabled'); return; }
    const now = Date.now();
    const found = findBanner();
    const advisory = findNearLimit();
    if (advisory) {
      // Parse only the reset clock, never interpret the usage percentage as a threshold.
      const nearAt = parseReset(advisory.text);
      if (nearAt) {
        rememberReset(nearAt, 'near_limit');
        state.lastNearLimit = { percent: advisory.percent, at: nearAt };
        saveConversation();
      }
    }
    remindInPageIfDue();

    // Banner disappearance is an observable signal, not absolute proof that
    // a generation completed. Wording deliberately says "resumed" only.
    if (state.pending) {
      if (!found && now - state.pending.at > 3000) {
        completeAttempt('confirmed');
        return;
      }
      if (now - state.pending.at > VERIFY_MS) {
        completeAttempt('unconfirmed');
        return;
      }
      display('Continue clicked · checking for resume');
      return;
    }
    if (!found) {
      if (advisory && state.lastNearLimit?.at) {
        display(`Usage advisory: ${advisory.percent}% used · reset scheduled ${formatTime(state.lastNearLimit.at)} · no pause detected`);
      } else {
        display('Monitoring · paused banner not present');
      }
      return;
    }
    if (found.timed) {
      if (state.resetSource !== found.content) {
        state.resetSource = found.content;
        state.resetAt = parseReset(found.content);
        saveConversation();
        if (state.resetAt) rememberReset(state.resetAt, 'usage_limit');
      }
      if (state.resetAt && now < state.resetAt) {
        display(`Waiting for reset · ~${Math.ceil((state.resetAt - now) / 60000)} min`);
        return;
      }
    }
    if (!enabledButton(found.button)) {
      display(`${found.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · Continue disabled`);
      return;
    }
    const cooldown = found.reason === 'ended_early' ? EARLY_COOLDOWN_MS : COOLDOWN_MS;
    if (state.lastClick && now - state.lastClick < cooldown) {
      display(`${found.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · cooldown active`);
      return;
    }
    // Write before triggering the UI action to prevent duplicate attempts.
    state.lastClick = now;
    state.pending = { at: now, reason: found.reason };
    saveConversation();
    try {
      found.button.click();
      display(`${found.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · Continue clicked · checking`);
    } catch {
      completeAttempt('unconfirmed');
    }
  }

  // Extension popup can query the active conversation without reading chat text.
  if (IS_EXTENSION) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request?.type === 'getState') {
        sendResponse({ enabled: !!settings.enabled, status: lastStatus,
          latest: history()[0] || null, historyCount: history().length,
          conversation: location.pathname });
      } else if (request?.type === 'setEnabled' && typeof request.enabled === 'boolean') {
        settings.enabled = request.enabled;
        saveSettings();
        check();
        sendResponse({ ok: true, enabled: settings.enabled });
      } else if (request?.type === 'showPanel') {
        openPanel();
        sendResponse({ ok: true });
      } else if (request?.type === 'getHistory') {
        sendResponse({ events: history() });
      }
      return false;
    });
  }
  setInterval(check, CHECK_MS);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  // Persisted timestamps survive restarts; check after reopening the page.
  check();
})();
