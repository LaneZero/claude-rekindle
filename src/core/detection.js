// Pure DOM-independent recognition rules shared by the browser builds and tests.
(function (global) {
  'use strict';
  // Identify actions by an explicit warning banner, not by a generic Continue button.
  const PAUSED = /Paused when your free usage ran out\./i;
  const EARLY = /This response ended early\./i;
  const TIMED = /Paused:\s*Your free usage returns\s+(?:(?:at|tomorrow\s+at)\s+|[A-Za-z]{3,9}\s+\d{1,2}\s+at\s+)\d{1,2}:\d{2}\s*(?:AM|PM)/i;
  const HARD_LIMIT = /You are out of free (?:messages|usage) until\s+(?:(?:tomorrow\s+at|[A-Za-z]{3,9}\s+\d{1,2}\s+at)\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)/i;
  const NEAR_LIMIT = /(?:Over\s*)?(\d{1,3})%\s+of\s+your\s+(?:\d+[- ]hour|\w+)[- ]limit\s+used\s*[·•|–-]\s*Resets\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const MONTHS = Object.freeze({jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11});
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
    // Match only supported Claude reset notices; date belongs to the message, not user text.
    const m = /(?:Your free usage returns|Resets at|You are out of free (?:messages|usage) until)\s+(?:(tomorrow)\s+at\s+|([A-Za-z]{3,9})\s+(\d{1,2})\s+at\s+|(?:at\s+)?)(\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(text);
    if (!m || +m[4] < 1 || +m[4] > 12 || +m[5] > 59) return null;
    const hour = (+m[4] % 12) + (m[6].toUpperCase() === 'PM' ? 12 : 0);
    const minute = +m[5];
    const current = new Date(now);
    const explicitMonth = m[2]?.slice(0,3).toLowerCase();
    if (m[2] && !Object.hasOwn(MONTHS,explicitMonth)) return null;
    const date = new Date(now);
    date.setHours(hour,minute,0,0);
    if (m[1]) {
      // Reuse a recently saved reset across a browser restart or date rollover.
      if (Number.isFinite(previousAt) && now - previousAt < 86400000 && previousAt - now < 172800000) {
        const prev = new Date(previousAt);
        if (prev.getHours() === hour && prev.getMinutes() === minute) return previousAt;
      }
      // 'Tomorrow' refers to the browser-local calendar day of the notice.
      date.setDate(current.getDate() + 1);
    } else if (m[2]) {
      // An explicit calendar date must never roll forward just because its time passed.
      const month = MONTHS[explicitMonth];
      const day = +m[3];
      const year = current.getFullYear();
      date.setFullYear(year,month,day);
      if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
      // December -> January rollover, but only when the displayed month is plausibly next year.
      if (month === 0 && current.getMonth() === 11) date.setFullYear(year+1);
    } else {
      if (Number.isFinite(previousAt) && now - previousAt >= 0 && now - previousAt < 86400000) {
        const prev = new Date(previousAt);
        if (prev.getHours() === hour && prev.getMinutes() === minute) return previousAt;
      }
      // A clock-only notice may mean tomorrow; preserve a just-passed clock for 10 min.
      if (date.getTime() < now - 600000) date.setDate(date.getDate()+1);
    }
    return date.getTime();
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
