// Optional real Chromium DOM smoke test. Run with: npm run test:browser
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const chromium = process.env.CHROME_BIN || 'chromium';
const fixture = await readFile('tests/fixtures/claude-banners.html','utf8');
const core = await readFile('src/core/detection.js','utf8');
const dir = await mkdtemp(join(tmpdir(),'clauderekindle-test-'));
const escapeScript = text => text.replace(/<\/script/gi,'<\\/script');
const html = fixture.replace('</body>', `<script>${escapeScript(core)}</script><script>
const check = (id, expected) => { const result = AutoResumeCore.findActionBanner(document.getElementById(id));
  return (result?.reason || null) === expected && (result ? result.button.textContent.trim() === 'Continue' : true); };
document.body.dataset.result = [check('early','ended_early'),check('paused','usage_limit'),check('advisory',null),check('timed','usage_limit'),check('unrelated',null)].every(Boolean) ? 'PASS' : 'FAIL';
</script></body>`);
try {
  const file = join(dir,'fixture.html');
  await writeFile(file, html);
  const result = execFileSync(chromium,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-software-rasterizer','--no-first-run','--disable-extensions','--dump-dom','file://'+file],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','ignore']});
  if (!result.includes('data-result="PASS"')) throw Error('Browser DOM test failed');
  console.log('PASS: 5 DOM fixtures validated by Chromium');
} finally { await rm(dir,{recursive:true,force:true}); }
