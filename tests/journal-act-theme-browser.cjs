'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/home/nick/.local/share/npm/lib/node_modules/@playwright/test/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const cases=[['reference','Campaign navigation'],['nyc','Part One — The Night Floors'],['bookshop','Exeunt — The Bookshop'],['boston','Part Two — A Volume of Secret Faces'],['missing-room','Exeunt — The Missing Room'],['map','Part Three — Like a Map Made of Skin'],['hotel','Exeunt — Hotel Broadalbin'],['carcosa','Part Four — The End of the World of the End']];
const exact='A source sentence.\n  With original spacing.\n';
const html='<!doctype html><html><head><meta charset="utf-8"><style>body{background:#222;margin:8px}.journal-sheet{max-width:100%}.content-link{background:#29282d;color:#30392b;white-space:nowrap}.window-header{padding:6px}.unrelated-journal{margin-top:13px}</style><link rel="stylesheet" href="../styles/king-in-yellow-journal.css"></head><body><div class="journal-sheet"><header class="window-header"><span class="window-title">Journal</span></header>'+cases.map(([id,h])=>'<article class="dg-il-journal dg-il-adventure" data-test="'+id+'"><header class="dg-il-masthead"><p class="dg-il-subtitle">'+h+'</p><h1 class="dg-il-series">Impossible Landscapes</h1></header><h2>Source section</h2><div class="dg-il-unified-quickstart"><p><a class="content-link" href="#target"><i class="fa-solid">▣</i> Open all 12 chapters and 74 subchapters with a long link label</a></p><a class="content-link broken" href="#broken">Missing link</a><div class="dg-il-adventure-grid"><div>Reading column</div><aside class="dg-il-adventure-sidebar">Sidebar</aside></div></div><div class="dg-il-casefile-native-embed"><article class="dg-il-journal"><pre class="dg-il-exact-text">'+exact+'</pre></article></div></article>').join('')+'</div><div class="unrelated-journal"><a class="content-link" href="#other">Unrelated</a></div><script type="module">import {applyJournalActThemes} from "../scripts/features/journal-theme.js";applyJournalActThemes(document);document.body.dataset.ready="true";</script></body></html>';
const fixture=path.join(root,'dist','act-theme-test.html');fs.writeFileSync(fixture,html);
function rgb(s){return s.match(/\d+/g).slice(0,3).map(Number)}
function lum(rgb){return rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)}
function contrast(a,b){let x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
(async()=>{
 const browser=await chromium.launch({executablePath:require('./browser-executable.cjs')(),headless:true,args:['--no-sandbox','--allow-file-access-from-files']});
 try {
  for(const width of [1130,420]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
   await page.goto(pathToFileURL(fixture).href);await page.waitForSelector('body[data-ready=true]');
   const result=await page.evaluate(()=>{
    const articles=[...document.querySelectorAll('[data-test]')];
    return {acts:articles.map(a=>({expected:a.dataset.test,actual:a.dataset.dgIlAct,art:getComputedStyle(a,'::before').backgroundImage,frame:getComputedStyle(a).borderImageSource,linkFg:getComputedStyle(a.querySelector('a.content-link')).color,linkBg:getComputedStyle(a.querySelector('a.content-link')).backgroundColor,icon:getComputedStyle(a.querySelector('i')).color,brokenFg:getComputedStyle(a.querySelector('a.broken')).color,brokenBg:getComputedStyle(a.querySelector('a.broken')).backgroundColor,nestedArt:getComputedStyle(a.querySelector('.dg-il-casefile-native-embed article'),'::before').content,source:a.querySelector('pre').textContent})),overflow:document.documentElement.scrollWidth>innerWidth,unrelated:getComputedStyle(document.querySelector('.unrelated-journal .content-link')).color,chrome:document.querySelector('.journal-sheet').classList.contains('dg-il-themed-sheet')};
   });
   assert.equal(result.acts.length,8);assert.equal(result.overflow,false);assert.equal(result.unrelated,'rgb(48, 57, 43)');assert.equal(result.chrome,true);
   for(const a of result.acts){assert.equal(a.expected,a.actual);assert.match(a.art,new RegExp('/'+a.expected+'\\.svg'));assert.match(a.frame,new RegExp('/'+a.expected+'-frame\\.svg'));assert.ok(contrast(a.linkFg,a.linkBg)>=7);assert.ok(contrast(a.icon,a.linkBg)>=4.5);assert.ok(contrast(a.brokenFg,a.brokenBg)>=4.5);assert.equal(a.source,exact);assert.equal(a.nestedArt,'none')}
   const link=page.locator('[data-test=boston] a.content-link').first();await link.focus();assert.equal(await link.evaluate(a=>getComputedStyle(a).outlineStyle),'solid');await link.hover();let hover=await link.evaluate(a=>[getComputedStyle(a).color,getComputedStyle(a).backgroundColor]);assert.ok(contrast(...hover)>=7);
   assert.deepEqual(errors,[]);
   await page.locator('[data-test=boston]').screenshot({path:path.join(root,'dist','act-boston-'+width+'.png')});
   console.log('ACT_THEME_BROWSER_PASS',width,'contrast',contrast(result.acts[0].linkFg,result.acts[0].linkBg).toFixed(2),'hover',contrast(...hover).toFixed(2),'all 8 themes, no overflow, preserved source, no nested decoration');
   await page.close();
  }
 } finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
