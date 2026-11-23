'use strict';
const {spawnSync}=require('node:child_process');

/** Choose an actually launchable browser, not merely an existing path.
 * On rolling Linux a Chromium binary may temporarily lack a shared library.
 * Healthy Chromium remains the default; Brave is an installed fallback.
 */
module.exports=function browserExecutable(){
 const options=[
   process.env.BROWSER_BIN,
   '/usr/bin/chromium','chromium',
   '/usr/bin/google-chrome','google-chrome',
   '/usr/bin/brave','brave',
 ].filter(Boolean);
 for(const candidate of options){
   const result=spawnSync(candidate,['--version'],{
     encoding:'utf8',timeout:4000,stdio:['ignore','pipe','pipe']
   });
   if(result.status===0)return candidate;
 }
 throw Error('No working Chromium-compatible browser; package unit tests still run.');
};
