'use strict';
const { chromium } = require('/home/nick/.local/share/npm/lib/node_modules/@playwright/test/node_modules/playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep) || !fs.existsSync(file)) {res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'text/plain');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:950,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/tests/scene-darkness-browser.html');
  await page.waitForFunction(()=>window.__ready===true,{timeout:7000});
  await page.evaluate(()=>window.__testRun());
  await page.waitForFunction(()=>window.__done===true,{timeout:7000});
  assert.deepEqual(errors,[]);
  const result=await page.evaluate(()=>({fields:window.__formValues(),log:window.__log,sectionCount:document.querySelectorAll('[data-dg-house-rules-darkness]').length,src:window.__scene.playlist}));
  assert.deepEqual(result.log,[
    'stop:daydaydaydayday1','play:nightnightnight1',
    'stop:nightnightnight1','play:daydaydaydayday1',
    'stop:daydaydaydayday1','next:mysteryshuffle01',
    'stop:mysteryshuffle01','sound:soundboardnight1:onetrackbell0001',
    'stop:soundboardnight1','play:daydaydaydayday1'
  ]);
  assert.equal(result.sectionCount,1);
  const output=path.join(root,'dist','scene-darkness-settings-search-preview.png');fs.mkdirSync(path.dirname(output),{recursive:true});
  await page.screenshot({path:output});
  console.log('CHROMIUM SCENE CONFIG PASS: searchable all-mode dropdown; saved selection; soundboard track picker; sequential/shuffle-safe playback; night/day hooks; original Scene Playlist preserved.');
  console.log('Screenshot: '+output);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
