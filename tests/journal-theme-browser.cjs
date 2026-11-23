'use strict';
const {chromium} = require('/home/nick/.local/share/npm/lib/node_modules/@playwright/test/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 let browser;
 try{
   browser=await chromium.launch({executablePath:require('./browser-executable.cjs')(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
   const source=path.join(root,'dist','king-in-yellow-sample.html');
   const css=path.join(root,'styles','king-in-yellow-journal.css');
   assert.ok(fs.existsSync(source));
   for(const viewport of [{width:1130,height:1050,tag:'desktop'}, {width:420,height:900,tag:'mobile'}]){
     const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
     await page.setContent(fs.readFileSync(source,'utf8'));
     await page.addStyleTag({path:css});
     const stats=await page.evaluate(()=>{
       const art=document.querySelector('.dg-il-journal');
       const other=document.querySelector('.unrelated-journal');
       const masthead=document.querySelector('.dg-il-masthead');
       const box=document.querySelector('.dg-il-alert');
       return {
         font:getComputedStyle(art).fontFamily,
         background:getComputedStyle(art).backgroundImage,
         border:getComputedStyle(art).borderTopColor,
         marginTop:getComputedStyle(other).marginTop,
         mastheadVisible:masthead.getBoundingClientRect().height>50,
         alertVisible:box.getBoundingClientRect().height>40,
         artWidth:art.getBoundingClientRect().width,
         windowWidth:window.innerWidth,
         overflow:document.documentElement.scrollWidth>window.innerWidth,
       };
     });
     assert.match(stats.font,/Georgia/);
     assert.match(stats.background,/gradient/);
     assert.equal(stats.marginTop,'13px','Unrelated journal leaked styles');
     assert.equal(stats.mastheadVisible,true);
     assert.equal(stats.alertVisible,true);
     assert.ok(!stats.overflow,'No horizontal overflow');
     fs.mkdirSync(path.join(root,'dist'),{recursive:true});
     await page.screenshot({path:path.join(root,'dist','king-in-yellow-journal-'+viewport.tag+'.png'),fullPage:true});
     console.log('THEME_BROWSER_PASS',viewport.tag,JSON.stringify(stats));
     await page.close();
   }
 }finally{
   if(browser) await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
