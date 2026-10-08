const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
if(process.platform!=='darwin'||process.arch!=='arm64')throw Error('此构建脚本需要 Apple Silicon Mac。');
const root=process.cwd(), out=path.join(root,'desktop-build');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-build-'));
try {
  execFileSync(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',env:{...process.env,WORKBENCH_DATA_DIR:tmp,WORKBENCH_DESKTOP_BUILD:'1',NEXT_TELEMETRY_DISABLED:'1'}});
  fs.rmSync(out,{recursive:true,force:true});
  fs.mkdirSync(path.join(out,'app'),{recursive:true});
  fs.mkdirSync(path.join(out,'resources','runtime'),{recursive:true});
  const forbidden = new Set(['workbench-data','artifacts','.env','.env.local','.env.production','.git','desktop-build']);
  fs.cpSync('.next-desktop/standalone',path.join(out,'resources','server'),{recursive:true,dereference:true,filter:p=>!p.split(path.sep).some(n=>forbidden.has(n)||n.startsWith('.env.'))});
  // Next 16.4 traces omit some dynamically selected app-route runtimes. Include its runtime package in full.
  fs.cpSync('node_modules/next',path.join(out,'resources','server','node_modules','next'),{recursive:true,dereference:true});
  fs.cpSync('.next-desktop/static',path.join(out,'resources','server','.next-desktop','static'),{recursive:true});
  fs.cpSync('public',path.join(out,'resources','server','public'),{recursive:true});
  fs.cpSync('migrations',path.join(out,'resources','server','migrations'),{recursive:true});
  fs.copyFileSync(process.execPath,path.join(out,'resources','runtime','node'));
  fs.chmodSync(path.join(out,'resources','runtime','node'),0o755);
  fs.copyFileSync('desktop/NODE-LICENSE.txt',path.join(out,'resources','runtime','NODE-LICENSE.txt'));
  fs.copyFileSync('desktop/main.cjs',path.join(out,'app','main.cjs'));
  fs.copyFileSync('desktop/server-boot.cjs',path.join(out,'resources','server-boot.cjs'));
  fs.writeFileSync(path.join(out,'app','package.json'),JSON.stringify({name:'selfmedia-workbench',productName:'自媒体工作台',version:require('../package.json').version,main:'main.cjs',description:'本地自媒体运营工作台',author:'SelfMedia Workbench',dependencies:{}},null,2));
  const sensitive=[];
  function audit(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(forbidden.has(f.name)||f.name.endsWith('.db')||['accounts.json','state.json','mcp.json','vault-key.bin'].includes(f.name))sensitive.push(p);if(f.isDirectory())audit(p);}}
  audit(out);
  if(sensitive.length)throw Error('打包审计失败：发现用户数据路径 '+sensitive.join(', '));
  fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify({architecture:'arm64',personalDataFiles:0,sourceRuntime:process.version,checkedAt:new Date().toISOString()},null,2));
  execFileSync(process.execPath,['node_modules/electron-builder/out/cli/cli.js','--config','desktop/electron-builder.json','--mac','--arm64','--dir','--publish','never'],{stdio:'inherit',env:{...process.env,CSC_IDENTITY_AUTO_DISCOVERY:'false'}});
  execFileSync(process.execPath,['scripts/finalize-mac.cjs'],{stdio:'inherit'});
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
