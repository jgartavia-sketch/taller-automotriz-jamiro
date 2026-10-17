const {spawn} = require('node:child_process');
const {resolve} = require('node:path');
const root = resolve(__dirname, '..');
const server = spawn(process.execPath, [resolve(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1'], {cwd:root});
let started = false;
const timeout = setTimeout(()=>{server.kill();console.error('El servidor no inició a tiempo.');process.exit(1)},30000);
server.stderr.pipe(process.stderr);
server.stdout.on('data', chunk => {
  process.stderr.write(chunk);
  if (!started && chunk.toString().includes('Ready')) {
    started = true; clearTimeout(timeout);
    const test = spawn(process.execPath,[resolve(__dirname,'responsive-ui.cjs')],{cwd:root,stdio:'inherit'});
    test.on('exit',code=>{server.kill();process.exit(code || 0)});
  }
});
server.on('exit',code=>{if(!started){clearTimeout(timeout);process.exit(code || 1)}});
