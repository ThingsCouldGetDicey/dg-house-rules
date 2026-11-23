'use strict';
const { chromium } = require('/home/nick/.local/share/npm/lib/node_modules/@playwright/test/node_modules/playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server=http.createServer((req,res)=>{
 const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const localPath=requestPath.startsWith('/modules/dg-house-rules/')
   ? requestPath.slice('/modules/dg-house-rules'.length) : requestPath;
 const file=path.resolve(root,'.'+localPath);
 if(!file.startsWith(root+path.sep) || !fs.existsSync(file)) {res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/plain');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:950,height:1040},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/tests/scene-darkness-browser.html');
  await page.waitForFunction(()=>window.__ready===true,null,{timeout:7000}).catch(error=>{throw Error('Scene did not initialize: '+errors.join(' | '),{cause:error})});
  await page.evaluate(()=>window.__testRun());
  await page.waitForFunction(()=>window.__done===true,{timeout:7000});
  assert.deepEqual(errors,[]);
  const result=await page.evaluate(()=>({fields:window.__formValues(),log:window.__log,
    sectionCount:document.querySelectorAll('[data-dg-house-rules-darkness]').length,
    popupOpen:!document.querySelector('.dg-house-rules-picker-popup').hidden,
    searchVisible:getComputedStyle(document.querySelector('.dg-house-rules-picker-search-input')).display!=='none',
    sourceValueHidden:getComputedStyle(document.querySelector('.dg-house-rules-picker-value')).display==='none',
    src:window.__scene.playlist}));
  assert.deepEqual(result.log,[
    'play:nightnightnight1','stop:daydaydaydayday1',
    'play:daydaydaydayday1','stop:nightnightnight1',
    'next:mysteryshuffle01','stop:daydaydaydayday1',
    'sound:soundboardnight1:onetrackbell0001','stop:mysteryshuffle01',
    'play:daydaydaydayday1','stop:soundboardnight1'
  ]);
  assert.equal(result.sectionCount,1);
  assert.equal(result.popupOpen,true);
  assert.equal(result.searchVisible,true);
  assert.equal(result.sourceValueHidden,true);
  const output=path.join(root,'dist','scene-darkness-settings-integrated-search-preview.png');fs.mkdirSync(path.dirname(output),{recursive:true});
  await page.screenshot({path:output});
  console.log('CHROMIUM SCENE CONFIG PASS: search inside expanded dropdown with icon; no external search; mouse, keyboard, Escape, outside click, saved value; all playback modes and day/night crossfade.');
  console.log('Screenshot: '+output);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
