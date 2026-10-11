import assert from 'node:assert/strict';
import {NemoLife} from '../dist/nemo-life.js';
let seed=9;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const idle=new NemoLife(random),seen=new Set();for(let i=0;i<6000;i++){const r=idle.tick(.05);seen.add(r.state);assert(r.goal.every(Number.isFinite));assert(Math.abs(r.goal[0])<1.5);}for(const s of ['observe','wander','meet','hide'])assert(seen.has(s),s);
const touch=new NemoLife(random);assert(touch.touch());assert(!touch.touch());assert.equal(touch.tick(.1).state,'greet');touch.tick(7);assert(touch.touch());
const attention=new NemoLife(random),pointer={x:.5,y:.1,speed:0,distance:.8};attention.tick(.4,{pointer,x:0,y:0});assert.equal(attention.state,'observe');attention.tick(.4,{pointer,x:0,y:0});assert.equal(attention.state,'curious');attention.tick(.1,{pointer:{...pointer,speed:9},x:0,y:0});assert.equal(attention.state,'curious');
const evade=new NemoLife(random);assert.equal(evade.tick(.1,{pointer:{...pointer,speed:9},x:0,y:0}).state,'evade');evade.tick(2);assert.notEqual(evade.state,'evade');
console.log('PASS: all idle states, bounded goals, attention delay, touch cooldown, evade recovery');
