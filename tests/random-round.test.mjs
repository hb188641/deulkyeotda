import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/game.js';
const Game=globalThis.Game;
test('40 unique questions and 16-question rounds without duplicates',()=>{
 assert.equal(Game.bank?.length,40);
 assert.equal(new Set(Game.bank.map(q=>q.id)).size,40);
 for(let seed=1;seed<=20;seed++){
  let x=seed;const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296};
  const round=Game.makeRound(undefined,random);
  assert.equal(round.length,16);
  assert.equal(new Set(round.map(q=>q.id)).size,16);
  assert.ok(round.slice(6).every(q=>Game.bank.some(b=>b.id===q.id)));
 }
});
test('challenge question order can be replayed and duplicate IDs are rejected',()=>{
 const ids=Game.bank?.slice(3,13).map(q=>q.id)||[];
 assert.deepEqual(Game.makeRound(ids).slice(6).map(q=>q.id),ids);
 assert.equal(Game.validQuestionIds([...ids.slice(0,9),ids[0]]),false);
 assert.equal(Game.validQuestionIds(['made-up',...ids.slice(1)]),false);
});

test('preparation is also random and challenge replays all 16 questions',()=>{
 const a=Game.makeRound(undefined,()=>0),b=Game.makeRound(undefined,()=>0.99);
 assert.notDeepEqual(a.slice(0,6).map(q=>q.id),b.slice(0,6).map(q=>q.id));
 const predicted=a.slice(6).map(q=>q.id),warm=a.slice(0,6).map(q=>q.id);
 assert.deepEqual(Game.makeRound(predicted,Math.random,warm).map(q=>q.id),a.map(q=>q.id));
 const guesses=Game.seal([0,1,0,1,0,1],a.slice(6),a.slice(0,6));
 assert.equal(guesses.length,10);assert.ok(guesses.every(p=>p.choice===0||p.choice===1));
});
