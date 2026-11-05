'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core/detection.js');

// Regression based on the real Claude composer banner: the hidden sr-only
// accessibility text must not break quota recognition.
test('quota limit recognizes visible text with hidden link description', () => {
  const banner = {
    textContent: 'You are out of free messages(opens in new tab) until 10:20 PMUpgrade',
    innerText: 'You are out of free messages until 10:20 PM\nUpgrade'
  };
  const visible = core.bannerVisibleText(banner);
  assert.equal(visible, 'You are out of free messages until 10:20 PM Upgrade');
  assert.equal(core.HARD_LIMIT.test(visible), true);
  const now = new Date(2026, 10, 5, 21, 0, 0).getTime();
  const at = core.resetTimestamp(visible, now);
  assert.equal(new Date(at).getHours(), 22);
  assert.equal(new Date(at).getMinutes(), 20);
});

test('hidden accessibility text is removed in DOM clone fallback', () => {
  const accessibleLabel = { remove() { this.removed = true; } };
  const detached = {
    textContent: 'You are out of free messages(opens in new tab) until 10:20 PMUpgrade',
    cloneNode() {
      return {
        querySelectorAll(selector) {
          assert.match(selector, /hidden/);
          return [accessibleLabel];
        },
        get textContent() {
          return accessibleLabel.removed
            ? 'You are out of free messages until 10:20 PMUpgrade'
            : 'You are out of free messages(opens in new tab) until 10:20 PMUpgrade';
        }
      };
    }
  };
  assert.equal(core.HARD_LIMIT.test(core.bannerVisibleText(detached)), true);
});

test('quota banner does not become a Continue action', () => {
  const banner = { innerText: 'You are out of free messages until 10:20 PM\nUpgrade', textContent: 'You are out of free messages(opens in new tab) until 10:20 PMUpgrade' };
  assert.equal(core.classify(core.bannerVisibleText(banner)), null);
});
