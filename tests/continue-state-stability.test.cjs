const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const core = require('../src/core/detection.js');
const source = readFileSync('src/extension/content.js', 'utf8');

// Lightweight scoped DOM fixtures: no browser globals or external packages.
function fixture({text, present = true, disabled = false, ariaDisabled = false}) {
  const button = {
    disabled,
    getAttribute: name => name === 'aria-disabled' && ariaDisabled ? 'true' : null,
    closest: () => null,
    innerText: 'Continue'
  };
  const banner = {
    innerText: text,
    querySelectorAll: selector => selector === 'button' && present ? [button] : []
  };
  return {querySelectorAll: () => [banner]};
}
test('read-only inspector distinguishes a disabled Continue from a missing one', () => {
  const msg = 'Paused: Your free usage returns at 3:20 AM. Continue then.';
  assert.equal(core.inspectContinue(fixture({text: msg, disabled: true})), 'disabled');
  assert.equal(core.inspectContinue(fixture({text: msg, ariaDisabled: true})), 'disabled');
  assert.equal(core.inspectContinue(fixture({text: msg, present: false})), 'unavailable');
  assert.equal(core.inspectContinue(fixture({text: msg})), 'enabled');
});
test('composer quota notice never creates a clickable Continue state', () => {
  assert.equal(core.inspectContinue(fixture({text: 'You are out of free messages until 3:20 AM', present: false})), 'absent');
});
test('status text and panel visibility are updated only on genuine changes', () => {
  assert.match(source, /if \(node.textContent !== text\) node.textContent = text/);
  assert.match(source, /if \(previousPanelDisplay !== displayValue\)/);
  assert.match(source, /if \(text === statusText && text === lastStatus\) return/);
  assert.match(source, /aria-live', 'off'/);
  assert.match(source, /height:78px/);
  assert.doesNotMatch(source, /no Continue button detected/);
});
