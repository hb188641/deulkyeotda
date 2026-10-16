import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameServer} from '../scripts/server.mjs';
test('standalone serves game, defaults to demo, opens SQLite, and protects server files',async()=>{
 const {server,closeDatabase}=createGameServer({DATABASE_PATH:':memory:'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  const home=await fetch(origin);assert.equal(home.status,200);assert.match(await home.text(),/익명|learning/);
  const status=await(await fetch(origin+'/api/status')).json();assert.equal(status.aiAvailable,false);
  const stats=await(await fetch(origin+'/api/learning')).json();assert.equal(stats.available,true);assert.equal(stats.completedPlays,0);
  for(const path of ['/.env','/data/game.sqlite','/lib/game/server.mjs','/scripts/server.mjs'])assert.equal((await fetch(origin+path)).status,404);
  const r=await fetch(origin+'/api/predict',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({warmup:[0,1]})});assert.equal(r.status,503);
 }finally{await new Promise(resolve=>server.close(resolve));closeDatabase();}
});
