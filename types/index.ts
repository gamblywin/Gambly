export type User = {
  id: string;
  name: string;
  handle: string;
  email?: string;
  bio?: string;
  avatar?: string;
  followers?: number;
  following?: number;
  posts?: number;
  winRate?: number;
  premium?: boolean;
};

export type Post = {
  id: string;
  authorId?: string;
  author?: User;
  title?: string;
  text?: string;
  type?: string;
  market?: string;
  odd?: number;
  stake?: number;
  confidence?: number;
  eventId?: string | null;
  predictionId?: string | null;
  slipId?: string | null;
  image?: string | null;
  likes?: number;
  comments?: number;
  likedBy?: string[];
  createdAt?: string;
};

export type LiveGame = {
  id: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  status?: string;
};

export type PredictionType = 'winner' | 'draw' | 'double_chance' | 'over_under' | 'both_teams_score' | 'exact_score' | 'first_half_winner' | 'corners_over_under' | 'cards_over_under' | 'shots_on_target_over_under' | 'total_shots_over_under' | 'offsides_over_under' | 'fouls_over_under' | 'team_goals_over_under' | 'player_anytime_score' | 'player_goals' | 'player_assists' | 'player_shots_on_target' | 'player_shots' | 'player_cards' | 'player_red_cards' | 'player_to_be_booked' | 'player_passes' | 'player_tackles' | 'player_fouls';
export type PredictionResult = 'pending' | 'won' | 'lost' | 'void';
export type EventStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

export interface Sport { id: string; name: string; }
export interface League { id: string; sportId: string; name: string; country?: string; }
export interface Team { id: string; name: string; shortName?: string; logoUrl?: string; }
export interface PlayerStat { id?: string | number | null; name: string; teamId?: string | number | null; goals?: number | null; assists?: number | null; shots?: number | null; shotsOnTarget?: number | null; yellowCards?: number | null; redCards?: number | null; passes?: number | null; tackles?: number | null; fouls?: number | null; minutes?: number | null; }
export interface Event {
  id: string; sportId: string; leagueId?: string | null;
  homeTeamId: string; awayTeamId: string;
  startTime: string; status: EventStatus;
  homeScore?: number | null; awayScore?: number | null;
  playerStats?: PlayerStat[]; playerStatsReceivedAt?: string | null; playerStatsSource?: string | null; resultSource?: string | null; resultSourceVersion?: string | null; resultReceivedAt?: string | null; providerEventId?: string | null; providerName?: string | null;
}
export interface Prediction {
  id: string; userId: string; eventId: string; slipId?: string | null;
  type: PredictionType; selection: string; odds?: number | null;
  result: PredictionResult; createdAt: string; settledAt?: string | null; settlementReason?: string | null;
}
export type PredictionSlipResult = 'pending' | 'won' | 'lost' | 'void';
export interface PredictionSlip {
  id: string; userId: string; title?: string; result: PredictionSlipResult;
  predictionIds: string[]; createdAt: string; settledAt?: string | null; source?: string; parserVersion?: string; parserConfidence?: number;
}
export interface UserStats {
  total: number; settled?: number; won: number; lost: number; pending: number; voided?: number;
  winRate: number; roi: number; streak: number;
}
export interface RankingRow {
  rank: number; userId: string; name: string; handle: string;
  avatar?: string; total: number; won: number; winRate: number; roi: number;
}
