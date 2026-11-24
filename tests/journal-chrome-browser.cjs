const fs=require('fs'), path=require('path'), assert=require('node:assert/strict');
const {chromium}=require('/home/nick/.local/share/npm/lib/node_modules/@playwright/test/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const acts=['reference','nyc','bookshop','boston','missing-room','map','hotel','carcosa'];
const pageIds=acts.map((a,i)=>'test-page-'+i);
const fixture=path.join(root,'dist','chrome-test.html');
const toc=acts.map((a,i)=>'<li data-page-id="'+pageIds[i]+'" class="'+(i===0?'active':'')+'"><div class="page-heading" data-action="goToHeading"><span class="page-index">'+i+'</span><span class="page-title">'+a+'</span><span class="page-ownership">◆</span></div></li>').join('');
fs.writeFileSync(fixture,'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../styles/king-in-yellow-journal.css"><style>body{margin:10px;background:#555}.journal-entry{box-sizing:border-box;max-width:100%;height:580px;display:flex;flex-direction:column}.window-header{display:flex;justify-content:space-between;padding:8px}.window-content{display:flex;min-height:0;flex:1}.journal-sidebar{width:32%;min-width:0;display:flex;flex-direction:column}.journal-sidebar search{display:flex;padding:4px}.journal-sidebar search input{min-width:0;width:100%}.toc{overflow:auto;flex:1}.toc ol{padding:0;margin:0;list-style:none}.page-heading{padding:6px;display:flex;gap:4px;cursor:pointer}.page-title{overflow:hidden;text-overflow:ellipsis}.action-buttons{display:flex;padding:6px;gap:3px}.journal-entry-content{flex:1;min-width:0;display:flex;flex-direction:column}.journal-header input{box-sizing:border-box;width:100%;font-size:14px}.journal-entry-pages{overflow:auto;flex:1;padding:8px}.other{background:#333;color:white}</style><div id="test" class="application journal-sheet journal-entry"><header class="window-header"><span class="window-title">Impossible Landscapes</span><button id="close">×</button></header><div class="window-content"><aside class="sidebar journal-sidebar"><search><button data-action="toggleLock">◆</button><input type="search" placeholder="Search Pages"></search><nav class="toc"><ol>'+toc+'</ol></nav><footer class="action-buttons"><button data-action="previousPage">‹</button><button data-action="createPage">Add</button><button data-action="nextPage">›</button></footer></aside><section class="journal-entry-content"><header class="journal-header"><input class="title" value="Impossible Landscapes — Handler Campaign Journal"></header><div class="journal-entry-pages scrollable"><article class="journal-entry-page"><header class="journal-page-header"><h2>Original section</h2></header><div class="dg-il-journal"><p>Original native source text.</p><a class="content-link" href="#source">Source link</a></div></article></div></section></div></div><div class="journal-sheet journal-entry other" id="other"><div class="journal-entry-content">Unrelated journal</div></div><script type="module">import {applyJournalChrome,detachJournalChrome} from "../scripts/features/journal-theme.js";const el=document.querySelector("#test");const ids='+JSON.stringify(pageIds)+';const pages=new Map(ids.map((id,i)=>[id,{flags:{"computer-mcp":{source:"il-unified-handler-journal-v1",chapterNumber:i===0?1:i+3}}}]));const app={entry:{id:"lPiCcEpa0KK0rfo0",pages},pageId:ids[0],isMultiple:false};window.app=app;window.apply=()=>applyJournalChrome(app,el);window.detach=()=>detachJournalChrome(el);window.switchPage=(i,multiple)=>{app.isMultiple=multiple;app.pageId=ids[i];el.querySelectorAll(".toc li").forEach((r,j)=>r.classList.toggle("active",i===j));if(!multiple)window.apply();};window.other=()=>applyJournalChrome({entry:{id:"other",pages}},document.querySelector("#other"));window.apply();document.body.dataset.ready="true";</script>');
(async()=>{
 const b=await chromium.launch({executablePath:require('./browser-executable.cjs')(),headless:true,args:['--no-sandbox','--allow-file-access-from-files']});
 try{for(const width of [1280,540,420]){
 const p=await b.newPage({viewport:{width,height:800}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));
 await p.goto(pathToFileURL(fixture).href);await p.waitForSelector('body[data-ready=true]');
 for(const [i,a] of acts.entries()){
  await p.evaluate(i=>window.switchPage(i,false),i);
  const actual=await p.locator('#test').evaluate(e=>({act:e.dataset.dgIlChrome,frame:getComputedStyle(e).borderImageSource,side:getComputedStyle(e.querySelector('.journal-sidebar')).backgroundColor,border:getComputedStyle(e).borderTopWidth}));
  assert.equal(actual.act,a);assert.match(actual.frame,new RegExp('/'+a+'-frame\\.svg'));assert.notEqual(actual.side,'rgba(0, 0, 0, 0)');
 }
 // Multi-page active state changes after initial render; no monkey patch or click interception.
 await p.evaluate(()=>{window.app.isMultiple=true;window.apply();window.switchPage(3,true)});
 await p.waitForFunction(()=>document.querySelector('#test').dataset.dgIlChrome==='boston');
 assert.equal(await p.evaluate(()=>window.other()),false);
 assert.equal(await p.locator('#other').evaluate(e=>e.classList.contains('dg-il-app-chrome')),false);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await p.locator('input[type=search]').isEditable(),true);
 await p.locator('input[type=search]').fill('Dorchester');
 assert.equal(await p.locator('input[type=search]').inputValue(),'Dorchester');
 await p.locator('#test').screenshot({path:path.join(root,'dist','chrome-boston-'+width+'.png')});
 await p.evaluate(()=>{window.detach();window.switchPage(1,true)});
 assert.equal(await p.locator('#test').evaluate(e=>e.classList.contains('dg-il-app-chrome')),false);
 assert.deepEqual(errors,[]);
 console.log('NATIVE_V14_CHROME_FIXTURE_PASS',width,'all eight frame assets, multi-page theme switching, search editable, no overflow or unrelated effects');
 await p.close();
 }}finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
