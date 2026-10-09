import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress, clearProgress } from '../src/lib/progress.ts';
const values = new Map();
globalThis.localStorage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const puzzle={id:'test',mode:'tile',gridSize:3,pieceCount:9};
const pieces=Array.from({length:9},(_,i)=>({id:`piece-${i}`,correctIndex:i,currentIndex:(i+1)%9,row:Math.floor(i/3),col:i%3}));
test('round trip and removal retain time, moves, and positions',()=>{
 assert.equal(saveProgress(puzzle,pieces,31,7),true);
 assert.deepEqual(loadProgress(puzzle).pieces,pieces);
 assert.equal(loadProgress(puzzle).seconds,31);
 assert.equal(loadProgress(puzzle).moves,7);
 clearProgress(puzzle.id);assert.equal(loadProgress(puzzle),undefined);
});
test('invalid JSON, schema, mismatched mode, and duplicate positions safely fall back',()=>{
 values.set('photo-puzzle-medal:progress:test','{broken');assert.equal(loadProgress(puzzle),undefined);
 saveProgress(puzzle,pieces,-1,0);assert.equal(loadProgress(puzzle),undefined);
 saveProgress(puzzle,pieces,0,0);assert.equal(loadProgress({...puzzle,mode:'jigsaw'}),undefined);
 saveProgress(puzzle,pieces.map(p=>({...p,currentIndex:0})),0,0);assert.equal(loadProgress(puzzle),undefined);
 saveProgress(puzzle,pieces.map(p=>({...p,row:99})),0,0);assert.equal(loadProgress(puzzle),undefined);
});
test('jigsaw geometry and shapes survive saving; invalid geometry is rejected',()=>{
 const j={...puzzle,mode:'jigsaw'};
 const jp=pieces.map(p=>({...p,id:`jigsaw-${p.correctIndex}`,x:0,y:634,width:200,height:200,targetX:p.col*200,targetY:p.row*200,zIndex:1,isSnapped:false,shape:{top:'flat',right:'tab',bottom:'blank',left:'flat'}}));
 saveProgress(j,jp,10,2);assert.deepEqual(loadProgress(j).pieces,jp);
 saveProgress(j,jp.map(p=>({...p,width:0})),10,2);assert.equal(loadProgress(j),undefined);
});
test('storage unavailable reports failure without crashing',()=>{
 const storage=globalThis.localStorage;globalThis.localStorage={getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}};
 assert.equal(saveProgress(puzzle,pieces,0,0),false);assert.equal(loadProgress(puzzle),undefined);assert.doesNotThrow(()=>clearProgress(puzzle.id));globalThis.localStorage=storage;
});
