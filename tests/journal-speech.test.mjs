import test from "node:test";
import assert from "node:assert/strict";
import {spokenChatContent,applyJournalSpeech} from "../scripts/features/journal-theme.js";
test("Escapes literal source and preserves newlines",()=>{
 assert.equal(spokenChatContent("A < B & C\nD"),'<div style="white-space:pre-wrap">A &lt; B &amp; C\nD</div>');
});
test("Non-GM cannot install chat controls",()=>{
 assert.equal(applyJournalSpeech({querySelectorAll(){throw Error("should not inspect")}}, {user:{isGM:false}}, {create(){}}),0);
});
test("Only reviewed speech is sent, once per explicit click",async()=>{
 const sent=[];let handler;let child;
 const source={dataset:{sourceRole:"npc-dialogue"},textContent:"Exact words.\nNo Handler notes."};
 const box={querySelector(sel){return sel.includes("pre.")?source:child},ownerDocument:{createElement(){return {addEventListener(_,fn){handler=fn}}}},append(x){child=x}};
 const root={querySelectorAll(){return [box]}};
 const game={user:{isGM:true}};const messages={async create(x){sent.push(x)}};
 assert.equal(applyJournalSpeech(root,game,messages),1);
 assert.equal(applyJournalSpeech(root,game,messages),0);
 assert.equal(sent.length,0);
 const event={preventDefault(){},stopPropagation(){}};
 await handler(event);
 assert.deepEqual(sent,[{content:'<div style="white-space:pre-wrap">Exact words.\nNo Handler notes.</div>',speaker:{alias:"Handler"},whisper:[]}]);
 game.user.isGM=false;await handler(event);assert.equal(sent.length,1);
});
