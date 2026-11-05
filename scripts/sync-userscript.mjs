import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const root = process.cwd();
const core = await readFile(join(root, 'src/core/detection.js'), 'utf8');
const content = await readFile(join(root, 'src/extension/content.js'), 'utf8');
const version = JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const metadata = `// ==UserScript==
// @name         ClaudeRekindle by LaneZero
// @namespace    https://github.com/LaneZero/claude-rekindle
// @version      ${version}
// @author       LaneZero
// @description  Resume eligible paused responses in Claude.ai; track announced quota reset times. Independent of Anthropic. Does not bypass limits.
// @match        https://claude.ai/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// ==/UserScript==

`;
if (!content.includes('const IS_BROWSER_ADDON = true;') || !content.includes('const IS_EXTENSION = typeof chrome')) {
  throw Error('Userscript build marker missing; refusing to generate incorrectly');
}
const userscriptContent = content
  .replace('const IS_BROWSER_ADDON = true;', 'const IS_BROWSER_ADDON = false;')
  .replace(/const IS_EXTENSION = typeof chrome[^;]*;/, 'const IS_EXTENSION = false;');
await writeFile(join(root,'src/userscript.user.js'), metadata + core + '\n' + userscriptContent);
console.log('Synced Tampermonkey userscript from shared core and content engine.');
