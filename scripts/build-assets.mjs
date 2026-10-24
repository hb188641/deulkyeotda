import {cpSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
const out=new URL('../dist/',import.meta.url);
rmSync(out,{recursive:true,force:true});mkdirSync(out);
cpSync(new URL('../index.html',import.meta.url),new URL('index.html',out));
for(const file of ['app.js','game.js','styles.css','favicon.svg'])cpSync(new URL('../public/'+file,import.meta.url),new URL(file,out));
writeFileSync(new URL('_headers',out),'/*\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
