const { normalize } = require('./settlement');
function parseMarket(text){
 const t=normalize(text);
 if(/(jogador|player).*(over|under|mais de|menos de).*(gol|gols|goals)/.test(t))return'player_goals';
 if(/(jogador|player).*(marcar|to score|anytime)/.test(t)||/(marcador|anytime scorer)/.test(t))return'player_anytime_score';
 if(/(jogador|player).*(assist|assistencia|assistir)/.test(t))return'player_assists';
 if(/(jogador|player).*(chutes? no alvo|shots? on target)/.test(t))return'player_shots_on_target';
 if(/(jogador|player).*(chutes?|shots?)/.test(t))return'player_shots';
 if(/(jogador|player).*(cartao|cards|advertido|booked)/.test(t))return'player_to_be_booked';
 if(/(jogador|player).*(cartoes|cards).*(over|under|mais de|menos de)/.test(t))return'player_cards';
 if(/(jogador|player).*(passes|passos|passes complet)/.test(t))return'player_passes';
 if(/(jogador|player).*(desarmes|tackles)/.test(t))return'player_tackles';
 if(/(jogador|player).*(faltas|fouls)/.test(t))return'player_fouls';
 if(/(escanteio|corner).*(over|under|mais de|menos de)/.test(t))return'corners_over_under';
 if(/(cartao|cards).*(over|under|mais de|menos de)/.test(t))return'cards_over_under';
 if(/(chutes? no alvo|shots? on target).*(over|under|mais de|menos de)/.test(t))return'shots_on_target_over_under';
 if(/(chutes? total|total shots).*(over|under|mais de|menos de)/.test(t))return'total_shots_over_under';
 if(/(impedimentos|offsides).*(over|under|mais de|menos de)/.test(t))return'offsides_over_under';
 if(/(faltas|fouls).*(over|under|mais de|menos de)/.test(t))return'fouls_over_under';
 if(/(gols? da casa|home goals|gols? mandante|gols? fora|away goals|gols? visitante).*(over|under|mais de|menos de)/.test(t))return'team_goals_over_under';
 if(/(dupla chance|double chance|1x|x2|12)/.test(t))return'double_chance';
 if(/(1º tempo|primeiro tempo|first half).*(vencedor|winner|empate|draw)/.test(t))return'first_half_winner';
 if(/(over|mais de)\s*\d+(?:\.\d+)?/.test(t))return'over_under';
 if(/(under|menos de)\s*\d+(?:\.\d+)?/.test(t))return'over_under';
 if(/(ambas|both).*(marcam|score|sim|yes)/.test(t)||/btts/.test(t))return'both_teams_score';
 if(/(placar exato|exact score)/.test(t)||/\b\d+\s*[-x:]\s*\d+\b/.test(t))return'exact_score';
 if(/(empate|draw)/.test(t))return'draw';
 if(/(vencedor|winner|casa|home|fora|away)/.test(t))return'winner';
 return null;
}
function threshold(text){const m=normalize(text).match(/(?:over|under|mais de|menos de)\s*(\d+(?:\.\d+)?)/);return m?Number(m[1]):null}
function canonicalSelection(market,raw){const t=normalize(raw);
 if(market==='player_anytime_score')return raw.trim();
 if(['player_assists','player_shots_on_target','player_shots','player_cards','player_passes','player_tackles','player_fouls'].includes(market)){const line=threshold(t);const side=/under|menos de/.test(t)?'under':'over';const player=t.replace(/(?:jogador|player)\s*/,'').replace(/\s*(?:over|under|mais de|menos de)\s*\d+(?:\.\d+)?/,'').trim();return `${player} ${side}${line!=null?' '+line:''}`.trim();}
 if(market==='player_to_be_booked')return raw.trim();
 if(['corners_over_under','cards_over_under','shots_on_target_over_under','total_shots_over_under','offsides_over_under','fouls_over_under','team_goals_over_under'].includes(market)){const m=t.match(/(over|mais de|under|menos de)\s*(\d+(?:\.\d+)?)/);if(m){const side=/^(over|mais de)$/.test(m[1])?'over':'under';if(market==='team_goals_over_under'){const team=/^(home|casa|mandante|gols? da casa)/.test(t)?'home':/^(away|fora|visitante|gols? fora)/.test(t)?'away':'';return `${team} ${side} ${m[2]}`.trim();}return `${side} ${m[2]}`;}}
 if(market==='double_chance'){if(/1x/.test(t))return'1x';if(/x2/.test(t))return'x2';if(/12/.test(t))return'12';}
 if(market==='first_half_winner'){if(/casa|home|1/.test(t))return'home';if(/fora|away|2/.test(t))return'away';if(/empate|draw|x/.test(t))return'draw';}
 if(market==='both_teams_score'){if(/\b(sim|yes|ambas|btts)\b/.test(t))return'yes';if(/\b(nao|no)\b/.test(t))return'no';}
 const score=t.match(/(\d+)\s*[-x:]\s*(\d+)/);if(market==='exact_score'&&score)return`${score[1]}-${score[2]}`;if(market==='draw')return'draw';if(market==='winner'){if(/\b(casa|home|1)\b/.test(t))return'home';if(/\b(fora|away|2)\b/.test(t))return'away';}return raw.trim();}
function parseBetSlipText(extractedText){const lines=String(extractedText||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const selections=[];for(let i=0;i<lines.length;i++){const market=parseMarket(lines[i]);if(!market)continue;const prev=lines[i-1]||'',next=lines[i+1]||'';const eventHint=prev&&!parseMarket(prev)?prev:next;const selection=canonicalSelection(market,lines[i]);let playerName=null;if(market.startsWith('player_'))playerName=selection.replace(/\s+(?:over|under)(?:\s+\d+(?:\.\d+)?)?$/i,'').trim();selections.push({eventHint:String(eventHint||'').slice(0,160),market,selection,playerName,raw:lines[i]});}return{selections,confidence:selections.length?0.65:0,requiresEventMatch:selections.length>0};}
module.exports={parseBetSlipText,parseMarket,canonicalSelection};
