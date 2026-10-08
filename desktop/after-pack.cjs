const {execFileSync}=require('node:child_process');
const path=require('node:path');
module.exports=async context=>{
 // Remove copied filesystem metadata from this newly built bundle before signing.
 execFileSync('/usr/bin/xattr',['-cr',path.join(context.appOutDir,'自媒体工作台.app')]);
};
