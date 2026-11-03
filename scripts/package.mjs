// Packaging is done by GitHub Actions using zip; local build leaves unpacked directories.
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
console.log('Distribution folders are ready under dist/.');
