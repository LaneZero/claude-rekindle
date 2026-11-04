(() => {
  'use strict';

  const VALID_INTERVALS = Object.freeze([1, 2, 5, 10, 15]);
  const DEFAULT_INTERVAL = 5;
  const MAX_SAFE_RELOADS = 3;
  const RELOAD_KEY = 'lanezero:rekindle:safe-reloads:' + location.pathname;
  const COOLDOWN_MS = 10 * 60_000;
  const EARLY_COOLDOWN_MS = 15_000;
  const VERIFY_MS = 20_000;
  const PREFIX = 'lanezero:claude-autoresume:v2:';
  const HISTORY_KEY = PREFIX + 'history';
  const RESET_KEY = PREFIX + 'resets';
  const REMINDER_KEY = PREFIX + 'reminder';
  const SETTINGS_KEY = PREFIX + 'settings';
  const { NEAR_LIMIT, HARD_LIMIT, remainingText } = AutoResumeCore;
  const MAX_HISTORY = 100;
  const IS_BROWSER_ADDON = true;
  const IS_EXTENSION = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  let lastStatus = 'Monitoring Claude';

  const readJSON = (store, key, fallback) => {
    try { return JSON.parse(store.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  };
  const writeJSON = (store, key, value) => {
    try { store.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
  };
  let settings = readJSON(localStorage, SETTINGS_KEY, { enabled: true, dismissed: false, checkMinutes: DEFAULT_INTERVAL, safeReload: false });
  if (typeof settings !== 'object' || !settings) settings = { enabled: true, dismissed: false };
  if (!VALID_INTERVALS.includes(Number(settings.checkMinutes))) settings.checkMinutes = DEFAULT_INTERVAL;
  settings.safeReload = settings.safeReload === true;
  let nextPeriodicCheck = 0;
  let lastObservedUrl = location.href;
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
  // A DOM change triggers prompt checks; the configurable timer is a fallback.
  function hasUnsentDraft() {
    return [...document.querySelectorAll('[contenteditable="true"], textarea, input:not([type="hidden"])')]
      .some(el => {
        if (el.closest('#lanezero-rekindle-panel') || el.closest('nav')) return false;
        return (el.matches('[contenteditable="true"]') ? el.textContent : el.value || '').trim().length > 0;
      });
  }
  function maybeSafeReload({hardLimit, found, now}) {
    // Never reload on a normal page, a live Continue, or unfinished user input.
    if (!settings.safeReload || !hardLimit || found || state.pending || hasUnsentDraft()) return;
    const schedule = currentSchedule();
    if (!schedule || schedule.reason !== 'usage_limit' || schedule.at > now) return;
    const record = readJSON(sessionStorage, RELOAD_KEY, { count: 0, last: 0 });
    if (record.count >= MAX_SAFE_RELOADS || now - record.last < settings.checkMinutes * 60_000) return;
    writeJSON(sessionStorage, RELOAD_KEY, { count: record.count + 1, last: now });
    location.reload();
  }
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
    return AutoResumeCore.findActionBanner(document);
  }
  // Background serializes claims across all tabs in the same browser profile.
  // No fallback click on an extension messaging failure: fail closed.
  async function claimContinue(reason) {
    if (!IS_EXTENSION) return {granted:true, token:null};
    try {
      const answer = await chrome.runtime.sendMessage({type:'claimResume', reason});
      return answer?.granted === true ? answer : {granted:false};
    } catch { return {granted:false}; }
  }
  async function releaseContinue(reason, token) {
    if (!IS_EXTENSION || !token) return;
    try { await chrome.runtime.sendMessage({type:'releaseResume', reason, token}); }
    catch { /* Cooldown expires if the background becomes unavailable. */ }
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
  function findHardLimit() {
    // A composer quota banner has no Continue button. Match only this explicit message.
    for (const banner of document.querySelectorAll('[data-cds="Banner"]')) {
      const text = banner.textContent || '';
      if (HARD_LIMIT.test(text)) return text;
    }
    return null;
  }
  function currentSchedule() {
    const item = reminders[location.pathname];
    return item && !item.resolved && Number.isFinite(item.at) ? item : null;
  }
  function scheduleStatus(item) {
    const local = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    }).format(new Date(item.at));
    const label = item.reason === 'usage_limit' ? 'Usage limit' : 'Usage advisory';
    return `${label} · local reset ${local} · ${remainingText(item.at)}`;
  }
  function parseReset(text) {
    return AutoResumeCore.resetTimestamp(text, Date.now(), reminders[location.pathname]?.at ?? null);
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
    // Force visibility over page-wide CSS rules; preserve manual dismissal.
    panel.style.setProperty('display', panelVisible ? 'block' : 'none', 'important');
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
  // Tampermonkey settings reuse the same monitoring engine as the extensions.
  if (!IS_BROWSER_ADDON && typeof GM_registerMenuCommand === 'function') {
    for (const minutes of VALID_INTERVALS) {
      GM_registerMenuCommand(`Check interval: ${minutes} minute(s)`, () => {
        settings.checkMinutes = minutes;
        nextPeriodicCheck = Date.now() + minutes * 60_000;
        saveSettings();
        openPanel();
        display(`Check interval set to ${minutes} minute(s)`);
      });
    }
    GM_registerMenuCommand('Toggle safe page reload (off by default)', () => {
      settings.safeReload = !settings.safeReload;
      saveSettings();
      openPanel();
      display(`Safe reload ${settings.safeReload ? 'enabled' : 'disabled'}`);
    });
  }
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Show ClaudeRekindle panel', openPanel);
  }
  // Mount on the root to avoid body-level clipping and stacking contexts.
  document.documentElement.append(panel);
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
    if (result === 'banner_cleared') resolveReset();
    // Each new event may show the panel, even when the previous one was dismissed.
    openPanel();
    display(result === 'banner_cleared'
      ? `${event.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · Continue clicked at ${formatTime(event.time)} · banner cleared`
      : `${event.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · Continue clicked at ${formatTime(event.time)}; result unconfirmed`);
  }

  let checking = false;
  async function check() {
    if (checking) return;
    checking = true;
    try { await checkInner(); } finally { checking = false; }
  }
  async function checkInner() {
    if (location.pathname !== path) loadConversation();
    if (!settings.enabled) { display('ClaudeRekindle disabled'); return; }
    const now = Date.now();
    const found = findBanner();
    const advisory = findNearLimit();
    const hardLimit = findHardLimit();
    if (hardLimit) {
      const hardAt = parseReset(hardLimit);
      if (hardAt) rememberReset(hardAt, 'usage_limit');
    }
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
    maybeSafeReload({hardLimit, found, now});

    // Banner disappearance is an observable signal, not absolute proof that
    // a generation completed. Wording deliberately says "resumed" only.
    if (state.pending) {
      if (!found && now - state.pending.at > 3000 && location.pathname === path) {
        completeAttempt('banner_cleared');
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
        display(currentSchedule()?.reason === 'usage_limit' ? scheduleStatus(currentSchedule()) + ' · no Continue button detected' : `Usage advisory: ${advisory.percent}% used · ${scheduleStatus(currentSchedule() || {at:state.lastNearLimit.at,reason:'near_limit'})} · no pause detected`);
      } else if (currentSchedule()) {
        display(scheduleStatus(currentSchedule()) + ' · no Continue button detected');
      } else {
        display('Monitoring · paused banner not present');
      }
      // A quota banner alone must never initiate a Continue click.
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
        display(scheduleStatus({at: state.resetAt, reason:'usage_limit'}));
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
    // Recheck the DOM after the asynchronous claim. A user may have resumed manually.
    const claim = await claimContinue(found.reason);
    if (!claim.granted) {
      display('Continue blocked by another tab or extension background unavailable');
      return;
    }
    if (!found.button.isConnected || !enabledButton(found.button) ||
        AutoResumeCore.findActionBanner(document)?.button !== found.button) {
      await releaseContinue(found.reason, claim.token);
      display('Continue button changed before click; waiting for next check');
      return;
    }
    // Write before triggering the UI action to prevent duplicate attempts.
    state.lastClick = Date.now();
    state.pending = { at: now, reason: found.reason };
    saveConversation();
    try {
      found.button.click();
      display(`${found.reason === 'ended_early' ? 'Early response' : 'Usage pause'} · Continue clicked · checking`);
    } catch {
      await releaseContinue(found.reason, claim.token);
      completeAttempt('unconfirmed');
    }
  }

  // Extension popup can query the active conversation without reading chat text.
  if (IS_EXTENSION) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request?.type === 'getState') {
        sendResponse({ enabled: !!settings.enabled, status: lastStatus,
          latest: history()[0] || null, historyCount: history().length,
          conversation: location.pathname, resetAt: currentSchedule()?.at ?? null, resetReason: currentSchedule()?.reason ?? null,
          checkMinutes: settings.checkMinutes, safeReload: settings.safeReload });
      } else if (request?.type === 'setEnabled' && typeof request.enabled === 'boolean') {
        settings.enabled = request.enabled;
        saveSettings();
        check();
        sendResponse({ ok: true, enabled: settings.enabled });
      } else if (request?.type === 'getSettings') {
        sendResponse({ checkMinutes: settings.checkMinutes, safeReload: settings.safeReload });
      } else if (request?.type === 'setSettings') {
        const minutes = Number(request.checkMinutes);
        if (!VALID_INTERVALS.includes(minutes) || typeof request.safeReload !== 'boolean') {
          sendResponse({ ok: false, error: 'Invalid settings' });
        } else {
          settings.checkMinutes = minutes;
          settings.safeReload = request.safeReload;
          saveSettings();
          nextPeriodicCheck = Date.now() + minutes * 60_000;
          sendResponse({ ok: true, checkMinutes: minutes, safeReload: settings.safeReload });
        }
      } else if (request?.type === 'showPanel') {
        openPanel();
        sendResponse({ ok: true, visible: panelVisible && panel.isConnected && getComputedStyle(panel).display !== 'none' });
      } else if (request?.type === 'getHistory') {
        sendResponse({ events: history() });
      }
      return false;
    });
  }
  // Keep the low-frequency fallback cheap; MutationObserver covers enabled Continue immediately.
  nextPeriodicCheck = Date.now() + settings.checkMinutes * 60_000;
  setInterval(() => {
    if (location.href !== lastObservedUrl) { lastObservedUrl = location.href; check(); }
    if (Date.now() >= nextPeriodicCheck) {
      nextPeriodicCheck = Date.now() + settings.checkMinutes * 60_000;
      check();
    }
  }, 1000);
  let mutationTimer;
  // Ignore mutations caused by our own UI to prevent endless observer/check/render cycles.
  // Only Claude DOM changes can schedule a new check.
  const panelMutation = node => {
    if (node === panel) return true;
    if (node.nodeType === 1) return panel.contains(node);
    return !!node.parentElement && panel.contains(node.parentElement);
  };
  const observer = new MutationObserver(records => {
    const externalChange = records.some(record => {
      if (panelMutation(record.target)) return false;
      if (record.type === 'childList') {
        return [...record.addedNodes, ...record.removedNodes].some(node => !panelMutation(node));
      }
      return true;
    });
    if (!externalChange) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(check, 650);
  });
  const watchRoot = document.body || document.documentElement;
  observer.observe(watchRoot, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  // Persisted timestamps survive restarts; check after reopening the page.
  check();
})();
