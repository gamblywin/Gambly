import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {settlePrediction}=require('./settlement');
const event={status:'finished',homeScore:2,awayScore:1,playerStats:[
 {id:10,name:'João Silva',goals:1,assists:1,shots:4,shotsOnTarget:2,yellowCards:1,redCards:0,passes:38,tackles:3,fouls:2},
 {id:11,name:'Pedro Souza',goals:0,assists:0,shots:2,shotsOnTarget:1,yellowCards:0,redCards:0,passes:20,tackles:5,fouls:1}
]};
for(const [type,selection,expected] of [
 ['player_anytime_score','João Silva','won'],
 ['player_assists','João Silva over 0.5','won'],
 ['player_shots_on_target','João Silva over 2.5','lost'],
 ['player_shots','João Silva over 3.5','won'],
 ['player_cards','João Silva over 0.5','won'],
 ['player_to_be_booked','Pedro Souza','lost'],
 ['player_passes','João Silva over 37.5','won'],
 ['player_tackles','Pedro Souza over 4.5','won'],
 ['player_fouls','João Silva over 2.5','lost']
]) test(`${type} settles`,()=>assert.equal(settlePrediction({type,selection},event).result,expected));

test('missing player data stays pending',()=>assert.equal(settlePrediction({type:'player_anytime_score',selection:'Outro Jogador'},event).result,'pending'));
test('cancelled event voids player market',()=>assert.equal(settlePrediction({type:'player_anytime_score',selection:'João Silva'},{...event,status:'cancelled'}).result,'void'));
