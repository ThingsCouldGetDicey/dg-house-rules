import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NIGHT_FLAG, NIGHT_SOUND_FLAG, THRESHOLD_FLAG, playlistModeLabel, nightSettings, playlistDecision,
  sceneUpdateAffectsAudio, isPrimaryGM, DarknessPlaylistController
} from '../scripts/features/darkness-playlist.js';

const mkList = (id, log, mode=2) => ({
  id, name:id, mode, playing:false,
  async playAll(){this.playing=true;log.push('play:'+id)},
  async playNext(){this.playing=true;log.push('next:'+id)},
  async playSound(sound){this.playing=true;log.push('sound:'+id+':'+sound.id)},
  async stopAll(){this.playing=false;log.push('stop:'+id)}
});
function fixture() {
  const log = [];
  const day=mkList('daydaydaydayday1',log);
  const night=mkList('nightnightnight1',log);
  const other=mkList('otherotherotherr1',log);
  const maps=new Map([[day.id,day],[night.id,night],[other.id,other]]);
  const scene={id:'S1',documentName:'Scene',active:true,playlist:day.id,
    environment:{darknessLevel:0},
    flags:{'dg-house-rules':{darknessPlaylist:night.id,darknessThreshold:0.5}},
    getFlag(scope,key){return this.flags[scope]?.[key]}};
  const gm={id:'gm',isGM:true,active:true};
  const game={user:gm,users:{activeGM:gm,contents:[gm]},scenes:{active:scene},playlists:{get:k=>maps.get(k),contents:[...maps.values()]}};
  return {log,scene,game,day,night,other,controller:new DarknessPlaylistController(()=>game,e=>{throw e})};
}

test('opt-in threshold has no global or generic Scene side effects',async()=>{
  const f=fixture(); f.scene.flags['dg-house-rules']={};
  assert.equal(playlistDecision(f.scene,f.game),null);
  assert.deepEqual(nightSettings(f.scene),{nightPlaylistId:'',nightSoundId:'',threshold:0.5});
  await f.controller.enqueue(f.scene);assert.deepEqual(f.log,[]);
});

test('night transition stops only day and starts night; no duplicates',async()=>{
  const f=fixture();f.day.playing=true;f.other.playing=true;
  f.scene.environment.darknessLevel=0.7;
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['stop:'+f.day.id,'play:'+f.night.id]);
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['stop:'+f.day.id,'play:'+f.night.id]);
  assert.equal(f.other.playing,true);
});

test('night->day restores default linked playlist without mutating Scene',async()=>{
  const f=fixture();f.scene.environment.darknessLevel=0.9;await f.controller.enqueue(f.scene);
  f.scene.environment.darknessLevel=0.1;await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['play:'+f.night.id,'stop:'+f.night.id,'play:'+f.day.id]);
  assert.equal(f.scene.playlist,f.day.id);
});

test('fast switches coalesce against current scene state, and updates are serial',async()=>{
  const f=fixture();f.scene.environment.darknessLevel=1;
  const first=f.controller.enqueue(f.scene);
  f.scene.environment.darknessLevel=0;
  const second=f.controller.enqueue(f.scene);
  await Promise.all([first,second]);
  assert.equal(f.night.playing,false);
  assert.equal(f.day.playing,true);
});

test('deactivation stops selected night ambience and does not start day on old scene',async()=>{
  const f=fixture();f.scene.environment.darknessLevel=1;await f.controller.enqueue(f.scene);
  f.scene.active=false;f.game.scenes.active={id:'otherScene',active:true};
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['play:'+f.night.id,'stop:'+f.night.id]);
});

test('unrelated clients and non-authoritative GMs never change audio',async()=>{
  for(const mode of ['player','secondGM']){
    const f=fixture();f.scene.environment.darknessLevel=1;
    f.game.user={id:mode,isGM:mode==='secondGM'};
    assert.equal(isPrimaryGM(f.game),false);
    await f.controller.enqueue(f.scene);assert.deepEqual(f.log,[]);
  }
});

test('missing playlist and same playlist: refuse safely',async()=>{
  for(const kind of ['missing','same']){
    const f=fixture();f.scene.environment.darknessLevel=1;
    if(kind==='missing')f.scene.flags['dg-house-rules'].darknessPlaylist='NOTFOUNDNOTFOUND';
    if(kind==='same')f.scene.flags['dg-house-rules'].darknessPlaylist=f.day.id;
    await f.controller.enqueue(f.scene);assert.deepEqual(f.log,[]);
  }
});

test('changing scene threshold or the linked day playlist updates active state',async()=>{
  const f=fixture();f.scene.environment.darknessLevel=0.4;
  f.scene.flags['dg-house-rules'][THRESHOLD_FLAG]=0.35;
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['play:'+f.night.id]);
  assert.equal(nightSettings(f.scene).threshold,0.35);
});

test('detect v14 nested and dotted darkness hook updates',()=>{
  assert.equal(sceneUpdateAffectsAudio({environment:{darknessLevel:1}}),true);
  assert.equal(sceneUpdateAffectsAudio({'environment.darknessLevel':0}),true);
  assert.equal(sceneUpdateAffectsAudio({active:false}),true);
  assert.equal(sceneUpdateAffectsAudio({flags:{'dg-house-rules':{[NIGHT_FLAG]:'x'}}}),true);
  assert.equal(sceneUpdateAffectsAudio({'flags.dg-house-rules.darknessPlaylist':'x'}),true);
  assert.equal(sceneUpdateAffectsAudio({name:'test',flags:{other:{x:1}}}),false);
});

test('clearing night selector while scene active stops night without touching day or other playlists',async()=>{
  const f=fixture();f.scene.environment.darknessLevel=1;await f.controller.enqueue(f.scene);
  f.scene.flags['dg-house-rules'][NIGHT_FLAG]='';await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['play:'+f.night.id,'stop:'+f.night.id]);
});

test('sequential and shuffle playlists use playNext, not playAll',async()=>{
  for(const mode of [0,1]){
    const f=fixture();
    f.night.mode=mode;
    f.scene.environment.darknessLevel=1;
    await f.controller.enqueue(f.scene);
    assert.deepEqual(f.log,['next:'+f.night.id]);
    f.scene.environment.darknessLevel=0;
    await f.controller.enqueue(f.scene);
    assert.deepEqual(f.log,['next:'+f.night.id,'stop:'+f.night.id,'play:'+f.day.id]);
    assert.equal(playlistModeLabel(mode),mode===0?'Sequential':'Shuffle');
  }
});

test('non-simultaneous daytime playlist is restored with native playNext',async()=>{
  const f=fixture();f.day.mode=1;
  f.scene.environment.darknessLevel=1;
  await f.controller.enqueue(f.scene);
  f.scene.environment.darknessLevel=0;
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['play:'+f.night.id,'stop:'+f.night.id,'next:'+f.day.id]);
});

test('soundboard selection requires explicit track and starts only chosen sound',async()=>{
  const f=fixture();f.night.mode=-1;
  const sound={id:'soundboardsound1',name:'Distant Bell'};
  f.night.sounds={contents:[sound]};
  f.scene.environment.darknessLevel=1;
  assert.equal(playlistDecision(f.scene,f.game),null,'must not pick arbitrary soundboard sound');
  await f.controller.enqueue(f.scene);assert.deepEqual(f.log,[]);
  f.scene.flags['dg-house-rules'][NIGHT_SOUND_FLAG]=sound.id;
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['sound:'+f.night.id+':'+sound.id]);
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['sound:'+f.night.id+':'+sound.id],'must not play twice');
  f.scene.environment.darknessLevel=0;
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['sound:'+f.night.id+':'+sound.id,'stop:'+f.night.id,'play:'+f.day.id]);
});

test('invalid soundboard sound ID is ignored and never accidentally played',async()=>{
  const f=fixture();f.night.mode=-1;
  f.night.sounds={contents:[{id:'soundboardsound1',name:'Bell'}]};
  f.scene.flags['dg-house-rules'][NIGHT_SOUND_FLAG]='missingSound000';
  f.scene.environment.darknessLevel=1;
  assert.equal(playlistDecision(f.scene,f.game),null);
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,[]);
});

test('night soundboard track can change safely mid-night',async()=>{
  const f=fixture();f.night.mode=-1;
  const bell={id:'soundboardsound1',name:'Bell'};
  const hum={id:'soundboardsound2',name:'Hum'};
  f.night.sounds={contents:[bell,hum]};
  f.scene.flags['dg-house-rules'][NIGHT_SOUND_FLAG]=bell.id;
  f.scene.environment.darknessLevel=1;
  await f.controller.enqueue(f.scene);
  f.scene.flags['dg-house-rules'][NIGHT_SOUND_FLAG]=hum.id;
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,[
    'sound:'+f.night.id+':'+bell.id,'stop:'+f.night.id,'sound:'+f.night.id+':'+hum.id
  ]);
  assert.equal(sceneUpdateAffectsAudio({flags:{'dg-house-rules':{darknessPlaylistSound:hum.id}}}),true);
});

test('soundboard daytime playlist is never auto-triggered without explicit sound',async()=>{
  const f=fixture();f.day.mode=-1;
  f.scene.environment.darknessLevel=1;
  await f.controller.enqueue(f.scene);
  f.scene.environment.darknessLevel=0;
  await f.controller.enqueue(f.scene);
  assert.deepEqual(f.log,['play:'+f.night.id,'stop:'+f.night.id]);
});
