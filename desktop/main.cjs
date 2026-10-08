const { app, BrowserWindow, Menu, shell, dialog, safeStorage, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
// Keep the existing safeStorage service identity for installed users.
app.setName('自媒体工作台');
const testProfile = process.env.WORKBENCH_TEST_PROFILE;
app.setPath('userData', testProfile || path.join(app.getPath('appData'), 'SelfMediaWorkbench'));
let window, backend, quitting = false, origin;
const profile = app.getPath('userData');
const dataRoot = path.join(profile, 'data');
const logs = path.join(profile, 'logs');
const token = randomBytes(32).toString('hex');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.show(); window.focus(); } });
  app.whenReady().then(start).catch(async error => {
    await dialog.showMessageBox({ type:'error', title:'无法启动小鱼自媒体工作台', message:'工作台启动失败', detail:`${error.message}\n日志目录：${logs}` });
    app.quit();
  });
}
app.on('activate', () => { if (window) { window.show(); window.focus(); } });
app.on('before-quit', () => { quitting = true; backend?.kill('SIGTERM'); });
app.on('window-all-closed', () => { if (quitting) app.quit(); });
async function encryptionKey() {
  const filename = path.join(profile, 'vault-key.bin');
  if (safeStorage.encryptStringAsync) {
    if (fs.existsSync(filename)) return await safeStorage.decryptStringAsync(fs.readFileSync(filename));
    const key = randomBytes(32).toString('base64');
    fs.writeFileSync(filename, await safeStorage.encryptStringAsync(key), { mode:0o600 });
    return key;
  }
  if (!safeStorage.isEncryptionAvailable()) throw Error('系统钥匙串不可用，无法安全保存模型密钥。');
  if (fs.existsSync(filename)) return safeStorage.decryptString(fs.readFileSync(filename));
  const key = randomBytes(32).toString('base64');
  fs.writeFileSync(filename, safeStorage.encryptString(key), { mode:0o600 });
  return key;
}
function freePort(preferred) {
  return new Promise((resolve,reject) => {
    const s=net.createServer();
    s.once('error',reject);
    s.listen(preferred, '127.0.0.1', () => { const port=s.address().port; s.close(()=>resolve(port)); });
  });
}
async function start() {
  fs.mkdirSync(dataRoot, { recursive:true, mode:0o700 });
  fs.mkdirSync(logs, { recursive:true, mode:0o700 });
  const key = await encryptionKey();
  const settings = path.join(profile,'desktop.json');
  const saved=fs.existsSync(settings) ? JSON.parse(fs.readFileSync(settings,'utf8')) : {};
  const port=await freePort(saved.port || 0);
  fs.writeFileSync(settings,JSON.stringify({ port }),{mode:0o600});
  origin=`http://127.0.0.1:${port}`;
  const resources=app.isPackaged ? process.resourcesPath : path.join(__dirname,'..','desktop-build','resources');
  const log=fs.openSync(path.join(logs,'service.log'),'a',0o600);
  backend=spawn(path.join(resources,'runtime','node'),[path.join(resources,'server-boot.cjs')],{
    cwd:path.join(resources,'server'),
    env:{ PATH:'/usr/bin:/bin:/usr/sbin:/sbin', HOME:app.getPath('home'), TMPDIR:app.getPath('temp'), NODE_ENV:'production', HOSTNAME:'127.0.0.1', PORT:String(port), WORKBENCH_DATA_DIR:dataRoot, NEXT_TELEMETRY_DISABLED:'1' },
    stdio:['ignore',log,log,'ipc']
  });
  fs.closeSync(log);
  let exited=false;
  backend.on('exit', () => { exited=true; if(!quitting && window) { dialog.showErrorBox('本地服务已停止','请退出并重新打开小鱼自媒体工作台。你的已保存数据仍保留在本机。'); app.quit(); } });
  backend.on('error', () => { exited=true; });
  backend.send({ key, token });
  for(let i=0;i<160;i++) {
    if(exited) throw Error('本地服务启动失败，请检查 service.log。');
    try { const r=await fetch(origin+'/api/studio/accounts',{headers:{'x-workbench-session':token},signal:AbortSignal.timeout(1000)});if(r.ok) break;if(i===159) throw Error('本地服务启动超时'); } catch { if(i===159) throw Error('本地服务启动超时'); }
    await new Promise(r=>setTimeout(r,250));
  }
  const ses=session.defaultSession;
  ses.webRequest.onBeforeSendHeaders({urls:[origin+'/*']}, (details,callback) => {
    details.requestHeaders['x-workbench-session']=token;
    callback({requestHeaders:details.requestHeaders});
  });
  ses.setPermissionRequestHandler((_wc,permission,callback)=>callback(permission==='clipboard-sanitized-write'));
  ses.on('will-download', (_event,item) => item.setSaveDialogOptions({title:'保存到本机',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))}));
  window=new BrowserWindow({width:1440,height:940,minWidth:880,minHeight:640,title:'小鱼自媒体工作台',backgroundColor:'#f2f5fb',show:false,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  window.on('close',event=>{if(!quitting){event.preventDefault();window.hide();}});
  window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin){event.preventDefault();external(url);}});
  window.on('page-title-updated',event=>event.preventDefault());
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'小鱼自媒体工作台',submenu:[{role:'about',label:'关于小鱼自媒体工作台'},{type:'separator'},{label:'打开数据目录',click:()=>shell.openPath(dataRoot)},{label:'打开日志目录',click:()=>shell.openPath(logs)},{type:'separator'},{role:'hide',label:'隐藏小鱼自媒体工作台'},{role:'quit',label:'退出小鱼自媒体工作台'}]},
    {label:'编辑',submenu:[{role:'undo',label:'撤销'},{role:'redo',label:'重做'},{type:'separator'},{role:'cut',label:'剪切'},{role:'copy',label:'复制'},{role:'paste',label:'粘贴'},{role:'selectAll',label:'全选'}]},
    {label:'显示',submenu:[{role:'reload',label:'重新载入'},{role:'resetZoom',label:'实际大小'},{role:'zoomIn',label:'放大'},{role:'zoomOut',label:'缩小'},{role:'togglefullscreen',label:'全屏'}]},
    {label:'窗口',submenu:[{role:'minimize',label:'最小化'},{label:'显示工作台',click:()=>window.show()}]}
  ]));
  await window.loadURL(origin+'/studio');
  window.show();
  if(process.env.WORKBENCH_SMOKE==='1') await smoke();
}
function external(value){try{const url=new URL(value);if(['https:','http:'].includes(url.protocol))shell.openExternal(url.href);}catch{}}
async function smoke() {
  await new Promise(r=>setTimeout(r,1600));
  const summary=await window.webContents.executeJavaScript(`(async()=>({title:document.title,body:document.body.innerText,accounts:await(await fetch('/api/studio/accounts')).json(),state:await(await fetch('/api/studio/state')).json(),models:await(await fetch('/api/studio/model-connect')).json(),mcp:await(await fetch('/api/studio/mcp-admin')).json()}))()`);
  const image=await window.webContents.capturePage();
  fs.writeFileSync(path.join(profile,'smoke.png'),image.toPNG());
  fs.writeFileSync(path.join(profile,'smoke.json'),JSON.stringify(summary,null,2));
  app.quit();
}
