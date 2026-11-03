const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const sizes = [16, 32, 48, 64, 96, 128, 256];

test('icon assets have correct PNG dimensions', () => {
  for (const size of sizes) {
    const b = fs.readFileSync(path.join('assets', `icon${size}.png`));
    assert.equal(b.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(b.readUInt32BE(16), size);
    assert.equal(b.readUInt32BE(20), size);
  }
});

test('extension manifests reference available icons', () => {
  for (const browser of ['chrome', 'firefox']) {
    const manifest = JSON.parse(fs.readFileSync(`config/manifest.${browser}.json`, 'utf8'));
    assert.equal(manifest.version, '2.6.0');
    for (const relative of Object.values(manifest.icons)) {
      assert.ok(fs.existsSync(`assets/${path.basename(relative)}`));
    }
    assert.ok(manifest.action.default_icon['16']);
  }
});

test('popup provides about, activity, support and exact donation addresses', () => {
  const page = fs.readFileSync('src/extension/popup.html', 'utf8');
  const script = fs.readFileSync('src/extension/popup.js', 'utf8');
  for (const section of ['overview', 'activity', 'about', 'support']) {
    assert.match(page, new RegExp(`page-${section}`));
  }
  assert.match(page, /https:\/\/github\.com\/LaneZero\/claude-rekindle/);
  const addresses = [
    'bc1q5tl36qpk27hf7upl8l753xa0gcm57adrvmwgkz',
    'TA5pibChqS7CeHiDvfP7V3uQVMynk6SxLq',
    '0x6634E26BA0e323182B7A9a89278E9a7BbCa9aF70',
    '91kuBFEZAnRk8ixsuzAQnAVvtzLAsQpPFRsfe285ZKUC'
  ];
  for (const address of addresses) {
    assert.ok(page.includes(address));
    assert.ok(script.includes(address));
  }
  assert.match(page, /Not affiliated with/);
});
