import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldHideTarget,concealRenderedTarget,resolveSpeakerActor} from '../scripts/features/roll-target-visibility.js';
class DGPercentileRoll { constructor(kind='skill'){this.options={rollType:kind};} }
class DGDamageRoll { constructor(){this.options={rollType:'damage'};} }
const message=(rolls=[new DGPercentileRoll()])=>({flags:{deltagreen:{chatCard:true}},rolls,speaker:{actor:'a1'}});
const hide=(actorType,{gm=false,npc=false,unnatural=true,msg=message()}={})=>shouldHideTarget({actorType,isGM:gm,hideNpc:npc,hideUnnatural:unnatural,message:msg});
test('Unnatural enabled by default, NPC independent',()=>{
 assert.equal(hide('unnatural'),true);
 assert.equal(hide('npc'),false);
 assert.equal(hide('npc',{npc:true}),true);
 assert.equal(hide('unnatural',{unnatural:false,npc:true}),false);
});
test('GM always sees target; agent/vehicle never modified',()=>{
 for(const type of ['unnatural','npc']) assert.equal(hide(type,{gm:true,npc:true,unnatural:true}),false);
 for(const type of ['agent','vehicle',null]) assert.equal(hide(type,{npc:true,unnatural:true}),false);
});
test('Only Delta Green percentile rolls, no damage or unmarked chat',()=>{
 for(const kind of ['stat','skill','typed-skill','weapon','sanity','luck','special-training'])
  assert.equal(hide('unnatural',{msg:message([new DGPercentileRoll(kind)])}),true,kind);
 assert.equal(hide('unnatural',{msg:message([new DGDamageRoll()])}),false);
 assert.equal(hide('unnatural',{msg:message([])}),false);
 assert.equal(hide('unnatural',{msg:{...message(),flags:{}}}),false);
});
test('Actor type comes from linked identity, not name',()=>{
 const actor={type:'npc',name:'An Unnatural'};
 assert.equal(resolveSpeakerActor(message(),{getSpeakerActor:()=>actor},null),actor);
 assert.equal(resolveSpeakerActor(message(),{getSpeakerActor:()=>null},{get:()=>actor}),actor);
 assert.equal(resolveSpeakerActor({speaker:{}},{getSpeakerActor:()=>null},{get:()=>null}),null);
});
function fakeDOM(){
 const doc={createElement:(tag)=>({tagName:tag,textContent:'',className:''}),createTextNode:(s)=>({textContent:s})};
 const label={dataset:{},ownerDocument:doc,querySelector:(k)=>k==='b'?{textContent:'Firearms'}:null,
  replaceChildren(...nodes){this.children=nodes;}};
 const card={querySelector:(k)=>k==='.dg-chat-card__roll-label'?label:null};
 return {label,element:{querySelector:(k)=>k==='.dg-chat-card'?card:null}};
}
test('Chat DOM hides only header target; repeat safe',()=>{
 const {label,element}=fakeDOM();
 assert.equal(concealRenderedTarget(element),true);
 assert.equal(label.children.map(n=>n.textContent).join(''),'Firearms: Target hidden');
 assert.equal(label.dataset.dgTargetHidden,'true');
 assert.equal(concealRenderedTarget(element),false);
});
test('Unrelated card and absent label do nothing',()=>{
 assert.equal(concealRenderedTarget(null),false);
 assert.equal(concealRenderedTarget({querySelector:()=>null}),false);
 const {label,element}=fakeDOM();label.querySelector=()=>null;
 assert.equal(concealRenderedTarget(element),false);
});
