// Pure DOM-independent recognition rules shared by the browser builds and tests.
(function (global) {
  'use strict';
  const PAUSED = /Paused when your free usage ran out\./i;
  const EARLY = /This response ended early\./i;
  const TIMED = /Paused:\s*Your free usage returns at\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i;
  const HARD_LIMIT = /You are out of free (?:messages|usage) until\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const NEAR_LIMIT = /(?:Over\s*)?(\d{1,3})%\s+of\s+your\s+(?:\d+[- ]hour|\w+)[- ]limit\s+used\s*[·•|–-]\s*Resets\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  function classify(text) {
    if (EARLY.test(text)) return 'ended_early';
    if (PAUSED.test(text) || TIMED.test(text)) return 'usage_limit';
    return null;
  }
  function advisory(text) {
    const m = NEAR_LIMIT.exec(text);
    if (!m || +m[1] > 100 || +m[2] < 1 || +m[2] > 12 || +m[3] > 59) return null;
    return {percent:+m[1], resetText:`${m[2]}:${m[3]} ${m[4].toUpperCase()}`};
  }
  function resetTimestamp(text, now = Date.now(), previousAt = null) {
    const m = /(?:Your free usage returns at|Resets at|You are out of free (?:messages|usage) until)\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(text);
    if (!m || +m[1] < 1 || +m[1] > 12 || +m[2] > 59) return null;
    const hour = (+m[1] % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
    if (Number.isFinite(previousAt) && now - previousAt >= 0 && now - previousAt < 86400000) {
      const d = new Date(previousAt);
      if (d.getHours() === hour && d.getMinutes() === +m[2]) return previousAt;
    }
    const d = new Date(now);
    d.setHours(hour,+m[2],0,0);
    if (d.getTime() < now-600000) d.setDate(d.getDate()+1);
    return d.getTime();
  }
  function remainingText(at, now = Date.now()) {
    if (!Number.isFinite(at) || at <= 0) return 'Unknown';
    const delta = at - now;
    if (delta <= 0) return 'Scheduled reset time passed; availability not confirmed';
    const mins = Math.ceil(delta / 60000);
    const hours = Math.floor(mins / 60);
    return hours ? `${hours}h ${mins % 60}m remaining` : `${mins}m remaining`;
  }
  // Only match actions inside a status banner; never click Upgrade, Dismiss, or composer buttons.
  function findActionBanner(root) {
    const banners = root.querySelectorAll('[data-testid="message-warning"][role="status"]');
    for (const banner of banners) {
      const text = banner.textContent || '';
      const reason = classify(text);
      if (!reason) continue;
      const button = [...banner.querySelectorAll('button')].find(el =>
        /^(continue|resume)$/i.test((el.textContent || '').trim()));
      if (button) return { banner, button, content: text, reason, timed: TIMED.test(text) };
    }
    return null;
  }
  const api = Object.freeze({PAUSED, EARLY, TIMED, HARD_LIMIT, NEAR_LIMIT, classify, advisory, resetTimestamp, remainingText, findActionBanner});
  global.AutoResumeCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
