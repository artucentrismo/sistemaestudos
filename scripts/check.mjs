import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';

const jsFiles = readdirSync('js').filter(name => name.endsWith('.js')).map(name => join('js', name));
for (const file of jsFiles) {
  new Script(readFileSync(file, 'utf8'), { filename: file });
  console.log('OK', file);
}

const html = readFileSync('index.html', 'utf8');
const inlineScripts = [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)];
if (!inlineScripts.length) throw new Error('No inline application script found in index.html');
for (let i = 0; i < inlineScripts.length; i++) {
  new Script(inlineScripts[i][1], { filename: `index.html:inline-${i + 1}` });
}
for (const src of [...html.matchAll(/<script\\s+type="module"\\s+src="([^"]+)"/g)].map(m => m[1])) {
  const path = src.replace(/^\\.\\//, '');
  if (!readFileSync(path, 'utf8')) throw new Error(`Empty module: ${path}`);
  console.log('OK', path);
}
console.log('All JavaScript syntax checks passed.');
