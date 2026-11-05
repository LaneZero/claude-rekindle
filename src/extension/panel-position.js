/* Pure shared positioning helper. No access to message contents. */
(function (global) {
  'use strict';
  const DEFAULT = 'bottom-right';
  const OPTIONS = Object.freeze(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  function normalize(value) {
    return OPTIONS.includes(value) ? value : DEFAULT;
  }
  function apply(element, value) {
    const position = normalize(value);
    // Clear both sides first so switching corners never inherits stale offsets.
    for (const property of ['top', 'right', 'bottom', 'left']) element.style[property] = 'auto';
    const [vertical, horizontal] = position.split('-');
    element.style[vertical] = '16px';
    element.style[horizontal] = '16px';
    return position;
  }
  global.RekindlePanelPosition = Object.freeze({ DEFAULT, OPTIONS, normalize, apply });
})(typeof globalThis !== 'undefined' ? globalThis : this);
