const fs=require('node:fs');
const path=require('node:path');
const {execFileSync:run}=require('node:child_process');
const root=process.cwd();
fs.mkdirSync(path.join(root,'artifacts','desktop-qa'),{recursive:true});
const temp=fs.mkdtempSync('/private/tmp/selfmedia-release-');
const app=path.join(temp,'自媒体工作台.app');
run('/usr/bin/ditto',[path.join(root,'dist','mac-arm64','自媒体工作台.app'),app]);

const version=require('../package.json').version;
const base=path.join(root,'dist',`SelfMediaWorkbench-${version}-mac-arm64`);
run('/usr/libexec/PlistBuddy',['-c','Set :LSMinimumSystemVersion 13.0',path.join(app,'Contents','Info.plist')]);
run('/usr/bin/xattr',['-cr',app]);
run('/usr/bin/codesign',['--force','--deep','--sign','-','--timestamp=none','--entitlements',path.join(root,'node_modules/app-builder-lib/templates/entitlements.mac.plist'),app],{stdio:'inherit'});
run('/usr/bin/xattr',['-cr',app]);
run('/usr/bin/codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
const stage=path.join(temp,'dmg');
fs.rmSync(stage,{recursive:true,force:true});fs.mkdirSync(stage,{recursive:true});
run('/usr/bin/ditto',[app,path.join(stage,'自媒体工作台.app')]);
run('/usr/bin/xattr',['-cr',path.join(stage,'自媒体工作台.app')]);
fs.symlinkSync('/Applications',path.join(stage,'Applications'));
fs.copyFileSync('docs/MAC安装说明.md',path.join(stage,'安装说明.txt'));
run('/usr/bin/hdiutil',['create','-volname','自媒体工作台','-srcfolder',stage,'-ov','-fs','HFS+','-format','UDZO',base+'.dmg'],{stdio:'inherit'});
fs.rmSync(base+'.zip',{force:true});
run('/usr/bin/ditto',['-c','-k','--keepParent',app,base+'.zip']);
for(const ext of ['dmg','zip'])fs.rmSync(base+'.'+ext+'.blockmap',{force:true});
console.log('已生成 Apple Silicon 安装包：'+base+'.dmg');

fs.rmSync(temp,{recursive:true,force:true});
