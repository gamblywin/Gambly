import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {settlePrediction}=require('./settlement.js');
const event=(h,a)=>({status:'finished',homeScore:h,awayScore:a});
const teams={homeName:'Flamengo',awayName:'Palmeiras'};
assert.equal(settlePrediction({type:'winner',selection:'Flamengo'},event(2,1),teams).result,'won');
assert.equal(settlePrediction({type:'winner',selection:'Palmeiras'},event(2,1),teams).result,'lost');
assert.equal(settlePrediction({type:'winner',selection:'draw'},event(1,1),teams).result,'won');
assert.equal(settlePrediction({type:'over_under',selection:'over 2.5'},event(2,1),teams).result,'won');
assert.equal(settlePrediction({type:'over_under',selection:'under 2.5'},event(2,1),teams).result,'lost');
assert.equal(settlePrediction({type:'both_teams_score',selection:'sim'},event(2,1),teams).result,'won');
assert.equal(settlePrediction({type:'both_teams_score',selection:'não'},event(2,0),teams).result,'won');
assert.equal(settlePrediction({type:'exact_score',selection:'2-1'},event(2,1),teams).result,'won');
assert.equal(settlePrediction({type:'winner',selection:'home'}, {status:'cancelled'},teams).result,'void');
assert.equal(settlePrediction({type:'winner',selection:'Flamengo'}, {status:'live',homeScore:2,awayScore:1},teams).result,'pending');
console.log('Settlement tests: OK');

// Slip aggregation rule used by the API.
const aggregate=(results)=>results.some(x=>x==='lost')?'lost':results.some(x=>x==='pending')?'pending':results.every(x=>x==='void')?'void':'won';
assert.equal(aggregate(['won','won']),'won');
assert.equal(aggregate(['won','lost']),'lost');
assert.equal(aggregate(['won','pending']),'pending');
assert.equal(aggregate(['void','void']),'void');
console.log('Prediction slip aggregation tests: OK');

