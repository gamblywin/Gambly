'use client';

import { useEffect, useState } from 'react';
import { getCommunities, getLiveGames, getMessages, getNotifications, getProfile } from '@/lib/api';

type Kind = 'profile' | 'notifications' | 'messages' | 'communities' | 'premium' | 'live' | 'explore';

const meta: Record<Kind, { eyebrow: string; title: string; description: string; icon: string }> = {
  profile: { eyebrow: 'MINHA CONTA', title: 'Perfil', description: 'Sua identidade, estatísticas e histórico de análises.', icon: '♙' },
  notifications: { eyebrow: 'ATIVIDADE', title: 'Notificações', description: 'Acompanhe curtidas, seguidores, comentários e alertas.', icon: '♧' },
  messages: { eyebrow: 'SOCIAL', title: 'Mensagens', description: 'Converse com outros membros da comunidade.', icon: '✉' },
  communities: { eyebrow: 'COMUNIDADE', title: 'Comunidades', description: 'Encontre grupos por esporte, campeonato e estratégia.', icon: '👥' },
  premium: { eyebrow: 'GAMBLY PREMIUM', title: 'Grupos Premium', description: 'Espaços exclusivos para análises e conteúdo avançado.', icon: '◆' },
  live: { eyebrow: 'AO VIVO', title: 'Jogos ao vivo', description: 'Acompanhe placares e eventos enquanto acontecem.', icon: '⚡' },
  explore: { eyebrow: 'DESCOBRIR', title: 'Explorar', description: 'Descubra pessoas, análises e assuntos em alta.', icon: '◉' },
};

export function FeaturePage({ kind }: { kind: Kind }) {
  const [data, setData] = useState<unknown[]>([]);
  const [profile, setProfile] = useState<{name?: string; handle?: string; followers?: number; following?: number; winRate?: number} | null>(null);
  const m = meta[kind];

  useEffect(() => {
    const run = async () => {
      try {
        if (kind === 'profile') { const r = await getProfile(); setProfile(r.user); return; }
        if (kind === 'notifications') { const r = await getNotifications(); setData(r.notifications || []); return; }
        if (kind === 'messages') { const r = await getMessages(); setData(r.conversations || []); return; }
        if (kind === 'communities') { const r = await getCommunities(); setData(r.communities || []); return; }
        if (kind === 'live') { const r = await getLiveGames(); setData(r.games || []); return; }
      } catch { /* guest/empty state */ }
    };
    run();
  }, [kind]);

  return (
    <>
      <div className="page-title">
        <div><span className="eyebrow">{m.eyebrow}</span><h1>{m.title}</h1><p>{m.description}</p></div>
        <div className="connection"><i/> Módulo conectado</div>
      </div>

      {kind === 'profile' && profile ? (
        <section className="card feature profile-feature">
          <div className="avatar avatar-lg">{profile.name?.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
          <h2>{profile.name}</h2><small>{profile.handle}</small>
          <div className="stats">
            <div><b>{profile.followers ?? 0}</b><span>Seguidores</span></div>
            <div><b>{profile.following ?? 0}</b><span>Seguindo</span></div>
            <div><b>{profile.winRate ?? 0}%</b><span>Win rate</span></div>
          </div>
        </section>
      ) : (
        <section className="feature-grid">
          <div className="card feature">
            <div className="feature-icon">{m.icon}</div>
            <h2>{m.title}</h2>
            <p>{data.length ? `${data.length} item(ns) carregado(s) da API.` : 'Nenhum item disponível ainda. Entre na conta ou conecte o Supabase para carregar os dados reais.'}</p>
            {data.length > 0 && <pre className="data-preview">{JSON.stringify(data.slice(0, 5), null, 2)}</pre>}
          </div>
          <div className="card feature">
            <h3>Próximas ações</h3>
            <ul className="feature-list">
              <li>Dados persistentes no Supabase</li>
              <li>Atualização em tempo real</li>
              <li>Interface responsiva e modular</li>
              <li>Controle de acesso por sessão</li>
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
