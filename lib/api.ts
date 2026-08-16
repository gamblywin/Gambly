import type { Event, LiveGame, PlayerStat, Post, Prediction, PredictionSlip, RankingRow, User, UserStats } from '@/types';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers, credentials: 'include', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Não foi possível concluir a operação.');
  return data as T;
}
export const getMe = () => api<{ user: User }>('/api/auth/me');
export const logout = () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
export const getFeed = (offset = 0, limit = 10) => api<{ posts: Post[]; total: number; hasMore: boolean; nextOffset: number }>(`/api/feed?limit=${limit}&offset=${offset}`);
export const createPost = (payload: Record<string, unknown>) => api<{ post: Post }>('/api/posts', { method: 'POST', body: JSON.stringify(payload) });
export const toggleLike = (id: string) => api<{ liked: boolean; likes: number }>(`/api/posts/${id}/like`, { method: 'POST' });
export const getProfile = () => api<{ user: User }>('/api/profile');
export const updateProfile = (payload: {name:string;handle:string;bio:string;avatar:string}) => api<{ user: User }>('/api/profile', { method:'PATCH', body: JSON.stringify(payload) });
export const getNotifications = () => api<{ notifications: unknown[] }>('/api/notifications');
export const getMessages = () => api<{ conversations: unknown[] }>('/api/messages');
export const getCommunities = () => api<{ communities: unknown[] }>('/api/communities');
export const getLiveGames = (params: { search?: string; country?: string; league?: string; sport?: string; status?: string } = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => { if (v) q.set(k,v); });
  return api<{ games: LiveGame[]; total: number; liveCount: number; updatedAt: string; source: string }>(`/api/sports/live${q.toString()?`?${q}`:''}`);
};
export const getSportsFeed = () => api<{ games: LiveGame[]; total: number; liveCount: number; updatedAt: string; source: string }>('/api/sports/feed');
export const getEvents = () => api<{ events: Event[] }>('/api/events');
export const getEvent = (id: string) => api<{ event: Event & {homeTeam:string;awayTeam:string;league:string;country?:string;sport?:string;events?: unknown[];stats?: any} }>(`/api/events/${encodeURIComponent(id)}`);
export const getEventPlayers = (id: string) => api<{ players: PlayerStat[]; source?: string }>(`/api/events/${encodeURIComponent(id)}/players`);
export const createPrediction = (payload: { eventId: string; type: string; selection: string; playerName?: string; playerId?: string | number; odds?: number }) => api<{ prediction: Prediction }>('/api/predictions', { method: 'POST', body: JSON.stringify(payload) });
export const createPredictionSlip = (payload: { title?: string; items: Array<{ eventId: string; type: string; selection: string; playerName?: string; playerId?: string | number; odds?: number }> }) => api<{ slip: PredictionSlip; predictions: Prediction[] }>('/api/prediction-slips', { method: 'POST', body: JSON.stringify(payload) });
export const getMyPredictionSlips = (result = 'all') => api<{ slips: PredictionSlip[] }>(`/api/prediction-slips/mine?result=${encodeURIComponent(result)}`);
export const getPredictionSlip = (id: string) => api<{ slip: PredictionSlip; predictions: Prediction[] }>(`/api/prediction-slips/${encodeURIComponent(id)}`);
export const getMyPredictions = (result = 'all') => api<{ predictions: Prediction[] }>(`/api/predictions/mine?result=${encodeURIComponent(result)}`);
export const getMyStats = () => api<{ stats: UserStats }>('/api/stats/me');
export const getRanking = (period = 'all') => api<{ ranking: RankingRow[] }>(`/api/ranking?period=${encodeURIComponent(period)}`);
