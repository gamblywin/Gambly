// GAMBLY settlement engine. Core football + team + player markets.
function normalize(value){return String(value??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function parseThreshold(selection){const m=normalize(selection).match(/^(over|under)\s*[: ]\s*(\d+(?:\.\d+)?)$/);return m?{side:m[1],line:Number(m[2])}:null;}
function metricTotal(event,metric){const s=event?.stats||{}; const h=s.home?.[metric], a=s.away?.[metric]; return Number.isFinite(Number(h))&&Number.isFinite(Number(a))?Number(h)+Number(a):null;}
function settleThreshold(value,selection){const p=parseThreshold(selection);if(value==null||!p)return null;return p.side==='over'?value>p.line:value<p.line;}
function teamSide(selection){const s=normalize(selection);if(/^(home|casa|1)\s+(over|under)/.test(s))return'home';if(/^(away|fora|2)\s+(over|under)/.test(s))return'away';return null;}
function playerFromPrediction(prediction,event){
  const explicit=prediction.playerName||prediction.player?.name;
  if(explicit)return explicit;
  if(['player_anytime_score','player_to_be_booked'].includes(normalize(prediction.type))) return String(prediction.selection||'').trim();
  const s=String(prediction.selection||'');
  const m=s.match(/^(.*?)\s+(?:over|under)\s*[: ]\s*\d+(?:\.\d+)?$/i);
  if(m)return m[1].trim();
  return null;
}
function playerMetric(event,playerName,metric){
  const rows=Array.isArray(event?.playerStats)?event.playerStats:[];
  const target=normalize(playerName||''); if(!target)return null;
  const row=rows.find(p=>normalize(p.name||'')===target || normalize(p.playerName||'')===target || String(p.id||'')===String(playerName));
  if(!row)return null;
  const v=metric==='cards' ? Number(row.yellowCards||0)+Number(row.redCards||0) : row[metric]; return v==null||!Number.isFinite(Number(v))?null:Number(v);
}
function settlePlayerMarket(prediction,event,type){
  const player=playerFromPrediction(prediction,event);
  if(!player)return{result:'pending',reason:'player_name_missing'};
  const metricMap={
    player_goals:'goals',player_assists:'assists',player_shots_on_target:'shotsOnTarget',player_shots:'shots',
    player_cards:'cards',player_red_cards:'redCards',player_passes:'passes',player_tackles:'tackles',player_fouls:'fouls'
  };
  if(type==='player_anytime_score'){
    const v=playerMetric(event,player,'goals'); if(v==null)return{result:'pending',reason:'player_data_missing'}; return{result:v>0?'won':'lost',reason:v>0?'player_scored':'player_did_not_score'};
  }
  if(type==='player_to_be_booked'){
    const y=playerMetric(event,player,'yellowCards'),r=playerMetric(event,player,'redCards'); if(y==null&&r==null)return{result:'pending',reason:'player_card_data_missing'}; return{result:(Number(y||0)+Number(r||0))>0?'won':'lost',reason:(Number(y||0)+Number(r||0))>0?'player_booked':'player_not_booked'};
  }
  const metric=metricMap[type]; if(!metric)return{result:'pending',reason:'unsupported_player_market'};
  const v=playerMetric(event,player,metric); if(v==null)return{result:'pending',reason:'player_data_missing'};
  const won=settleThreshold(v,prediction.selection.replace(/^.*?\s+(?=(?:over|under)\s)/i,''));
  if(won===null)return{result:'pending',reason:'player_threshold_missing'};
  return{result:won?'won':'lost',reason:won?'selection_hit':'selection_missed'};
}
function settlePrediction(prediction,event,teams={}){
  if(!prediction||!event)return{result:'pending',reason:'missing_data'};
  if(event.status==='cancelled')return{result:'void',reason:'event_cancelled'};
  if(event.status!=='finished')return{result:'pending',reason:'event_not_finished'};
  const home=Number(event.homeScore),away=Number(event.awayScore);
  if(!Number.isInteger(home)||!Number.isInteger(away))return{result:'pending',reason:'score_missing'};
  const total=home+away,type=normalize(prediction.type),selection=normalize(prediction.selection);let won=null;
  if(type.startsWith('player_')) return settlePlayerMarket(prediction,event,type);
  if(type==='winner'||type==='draw'){
    const hn=normalize(teams.homeName||'home'),an=normalize(teams.awayName||'away');
    if(['home','casa','1',hn].includes(selection))won=home>away;else if(['away','fora','2',an].includes(selection))won=away>home;else if(['draw','empate','x'].includes(selection))won=home===away;else return{result:'pending',reason:'unsupported_winner_selection'};
  } else if(type==='double_chance'){
    if(selection==='1x'||selection==='home_or_draw')won=home>=away;else if(selection==='x2'||selection==='draw_or_away')won=away>=home;else if(selection==='12'||selection==='home_or_away')won=home!==away;else return{result:'pending',reason:'unsupported_double_chance_selection'};
  } else if(type==='over_under') won=settleThreshold(total,selection);
  else if(type==='both_teams_score'){const yes=['yes','sim','true'].includes(selection),no=['no','nao','false'].includes(selection);if(!yes&&!no)return{result:'pending',reason:'unsupported_btts_selection'};won=yes?(home>0&&away>0):!(home>0&&away>0);}
  else if(type==='exact_score'){const m=selection.match(/^(\d+)\s*[-x:]\s*(\d+)$/);if(!m)return{result:'pending',reason:'unsupported_exact_score_selection'};won=home===Number(m[1])&&away===Number(m[2]);}
  else if(type==='first_half_winner'){const hh=Number(event.halfTimeHomeScore),ha=Number(event.halfTimeAwayScore);if(!Number.isInteger(hh)||!Number.isInteger(ha))return{result:'pending',reason:'first_half_score_missing'};if(['home','casa','1'].includes(selection))won=hh>ha;else if(['away','fora','2'].includes(selection))won=ha>hh;else if(['draw','empate','x'].includes(selection))won=hh===ha;else return{result:'pending',reason:'unsupported_first_half_selection'};}
  else {
    const map={corners_over_under:'corners',cards_over_under:'cards',shots_on_target_over_under:'shotsOnTarget',total_shots_over_under:'totalShots',offsides_over_under:'offsides',fouls_over_under:'fouls'};
    if(map[type]){let value=metricTotal(event,map[type]);if(type==='cards_over_under'){const y=metricTotal(event,'yellowCards'),r=metricTotal(event,'redCards');value=(y!=null&&r!=null)?y+r:null;}won=settleThreshold(value,selection);if(won===null)return{result:'pending',reason:`${type}_data_missing`};}
    else if(type==='team_goals_over_under'){const side=teamSide(selection);if(!side)return{result:'pending',reason:'team_goals_side_missing'};const lineMatch=selection.match(/(over|under)\s*[: ]\s*(\d+(?:\.\d+)?)/);if(!lineMatch)return{result:'pending',reason:'team_goals_line_missing'};const value=side==='home'?home:away;won=lineMatch[1]==='over'?value>Number(lineMatch[2]):value<Number(lineMatch[2]);}
    else return{result:'pending',reason:'unsupported_prediction_type'};
  }
  if(won===null)return{result:'pending',reason:'market_data_missing'};
  return{result:won?'won':'lost',reason:won?'selection_hit':'selection_missed'};
}
function settlePredictions(predictions,event,teams={}){return predictions.map(p=>p.result==='pending'?{...p,...settlePrediction(p,event,teams)}:p);}
module.exports={settlePrediction,settlePredictions,normalize,parseThreshold,playerMetric};
