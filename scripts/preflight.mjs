// ClaudeRekindle release preflight. Static checks do not replace browser QA.
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
const root = process.cwd();
const read = async path => readFile(join(root, path), 'utf8');
const fail = message => { throw new Error(`Release preflight: ${message}`); };
const pkg = JSON.parse(await read('package.json'));
if (!/^\d+\.\d+\.\d+-rc\.\d+$/.test(pkg.version)) fail('expected pre-release npm version');
const storeVersion = pkg.version.split('-')[0];
const requiredPermissions = ['alarms','notifications','storage','tabs'];
// Verify release artifacts remain local rather than accidentally committed.
const ignoreRules = await read('.gitignore');
for (const pattern of ['/release/', '/dist/', '/node_modules/']) {
  if (!ignoreRules.split(/\r?\n/).includes(pattern)) fail(`missing .gitignore rule: ${pattern}`);
}
for (const browser of ['chrome','firefox']) {
  const manifest = JSON.parse(await read(`dist/${browser}/manifest.json`));
  if (manifest.version !== storeVersion) fail(`${browser} version mismatch`);
  if (manifest.manifest_version !== 3) fail(`${browser} is not Manifest V3`);
  if (JSON.stringify([...manifest.permissions].sort()) !== JSON.stringify([...requiredPermissions].sort())) fail(`${browser} permissions unexpectedly changed`);
  if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(['https://claude.ai/*'])) fail(`${browser} host scope too wide`);
  if (manifest.optional_permissions?.length || manifest.optional_host_permissions?.length) fail(`${browser} unexpected optional permissions`);
  if (manifest.content_security_policy?.extension_pages?.includes('unsafe-eval')) fail(`${browser} unsafe-eval CSP`);
  if (manifest.content_scripts?.[0]?.js?.join(',') !== 'core.js,content.js') fail(`${browser} core load order incorrect`);
  if (!manifest.action?.default_popup) fail(`${browser} no toolbar popup`);
  if (browser === 'firefox' && !manifest.browser_specific_settings?.gecko?.id) fail('Firefox extension id absent');
  for (const size of [16,32,48,64,96,128,256]) {
    const icon = await readFile(join(root,`dist/${browser}/icons/icon${size}.png`));
    if (icon.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || icon.readUInt32BE(16)!==size || icon.readUInt32BE(20)!==size) fail(`${browser} invalid ${size}px PNG`);
  }
  const popup = await read(`dist/${browser}/popup.html`);
  if (!popup.includes('v2.8.0 RC 2') || !popup.includes('2.8.0 RC 2')) fail(`${browser} popup displays stale version`);
  if (!popup.includes('LaneZero') || !popup.includes('https://github.com/LaneZero/claude-rekindle')) fail(`${browser} branding missing`);
  for (const name of ['popup.js','content.js','background.js','core.js']) {
    const file = await stat(join(root,`dist/${browser}/${name}`));
    if (file.size <= 0) fail(`${browser} empty ${name}`);
  }
}
const userscript = await read('dist/tampermonkey/claude-rekindle.user.js');
if (!userscript.includes(`// @version      ${pkg.version}`)) fail('userscript version mismatch');
if (!userscript.includes('// @match        https://claude.ai/*')) fail('userscript site restriction missing');
const docs = ['PRIVACY.md','docs/RELEASE_CHECKLIST.md','docs/STORE_LISTING.md','docs/V2.8_RELEASE_NOTES.md'];
for (const doc of docs) if ((await read(doc)).length < 150) fail(`missing or empty ${doc}`);
if ((await read('PRIVACY.md')).includes('collects no data whatsoever')) fail('privacy claim too broad');
console.log(`PASS: ${pkg.version} release metadata, scope, privacy docs and icon assets validated.`);
console.log('MANUAL GATE: Chrome, Firefox desktop, and Firefox Android runtime verification still required.');
