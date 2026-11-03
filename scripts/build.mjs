import {mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
const root = process.cwd();
const out = join(root,'dist');
await rm(out,{recursive:true,force:true});
for(const browser of ['chrome','firefox']) {
  const dir=join(out,browser);
  await mkdir(join(dir,'icons'),{recursive:true});
  for(const file of ['content.js','background.js','popup.html','popup.css','popup.js'])
    await copyFile(join(root,'src','extension',file),join(dir,file));
  await copyFile(join(root,'src','core','detection.js'),join(dir,'core.js'));
  await copyFile(join(root,'assets','icon128.png'),join(dir,'icons','icon128.png'));
  const manifest=JSON.parse(await readFile(join(root,'config',`manifest.${browser}.json`),'utf8'));
  if(manifest.content_scripts?.[0]?.js?.[0]!=='core.js') throw Error('Core must load first');
  await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
await mkdir(join(out,'tampermonkey'),{recursive:true});
await copyFile(join(root,'src','userscript.user.js'),join(out,'tampermonkey','claude-rekindle.user.js'));
console.log('Built Chrome, Firefox and legacy Tampermonkey distributions.');
