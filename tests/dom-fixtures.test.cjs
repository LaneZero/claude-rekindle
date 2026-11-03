const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../src/core/detection.js');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/claude-banners.html'), 'utf8');

// Parse sanitized fixture excerpts without third-party dependencies.
// The browser-specific DOM check is run separately with headless Chromium.
function section(name) {
  const start = `<section id="${name}">`;
  const end = '</section>';
  const offset = fixture.indexOf(start);
  assert.notEqual(offset, -1);
  return fixture.slice(offset + start.length, fixture.indexOf(end, offset));
}
test('sanitized real-world fixtures capture all three states', () => {
  assert.equal(core.classify(section('early').replace(/<[^>]*>/g,' ')), 'ended_early');
  assert.equal(core.classify(section('paused').replace(/<[^>]*>/g,' ')), 'usage_limit');
  assert.equal(core.classify(section('timed').replace(/<[^>]*>/g,' ')), 'usage_limit');
  assert.equal(core.classify(section('advisory').replace(/<[^>]*>/g,' ')), null);
  assert.equal(core.advisory(section('advisory').replace(/<[^>]*>/g,' ')).percent, 90);
});

test('DOM selector is scoped to warning banners and their own Continue button', () => {
  function root(text, buttons, hasWarning = true) {
    return {querySelectorAll(selector) {
      assert.equal(selector, '[data-testid="message-warning"][role="status"]');
      return hasWarning ? [{textContent:text, querySelectorAll:() => buttons.map(label=>({textContent:label}))}] : [];
    }};
  }
  assert.equal(core.findActionBanner(root('This response ended early.', ['Upgrade','Continue'])).reason,'ended_early');
  assert.equal(core.findActionBanner(root('Over 90% of your 5-hour limit used · Resets at 5:00 PM',['Upgrade'],false)),null);
  assert.equal(core.findActionBanner(root('This response ended early.', ['Dismiss'])),null);
  assert.equal(core.findActionBanner(root('Unrelated message', ['Continue'])),null);
});
