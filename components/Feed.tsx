'use client';
import { useEffect, useState } from 'react';
import { getFeed, getMe } from '@/lib/api';
import type { Post, User } from '@/types';
import { PostCard } from './PostCard';

export function Feed() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let alive = true;

    const refreshAuth = () => {
      getMe()
        .then(r => {
          if (alive) setUser(r.user);
        })
        .catch(() => {
          if (alive) setUser(null);
        });
    };

    refreshAuth();

    const onAuthRefresh = () => refreshAuth();
    const onPostCreated = (event: Event) => {
      const post = (event as CustomEvent).detail;
      if (post?.id) setPosts(current => [post, ...current.filter(x => x.id !== post.id)]);
    };
    window.addEventListener('gambly:auth-refresh', onAuthRefresh);
    window.addEventListener('gambly:post-created', onPostCreated);

    return () => {
      alive = false;
      window.removeEventListener('gambly:auth-refresh', onAuthRefresh);
      window.removeEventListener('gambly:post-created', onPostCreated);
    };
  }, []);

  useEffect(() => {
    getFeed(0)
      .then(d => {
        setPosts(d.posts || []);
        setMore(!!d.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function load() {
    const next = offset + 10;
    try {
      const d = await getFeed(next);
      setPosts(p => [...p, ...(d.posts || [])]);
      setOffset(next);
      setMore(!!d.hasMore);
    } catch {}
  }

  return (
    <section className="feed">
      <div className="live-feed-banner card"><div><span className="eyebrow">GAMBLY LIVE</span><h2>Acompanhe. Analise. Publique.</h2><p>Encontre uma partida ao vivo e transforme sua leitura em uma publicação.</p></div><a href="/live">Abrir Ao Vivo →</a></div>

      <div className="composer card">
        {user ? (
          <>
            <div className="composer-top">
              <div className="avatar composer-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  user.name.split(/\s+/).map(x => x[0]).slice(0,2).join('').toUpperCase()
                )}
              </div>
              <button
                className="composer-input"
                onClick={() => window.dispatchEvent(new Event('gambly:compose'))}
              >
                Compartilhe sua análise com a comunidade...
              </button>
            </div>
            <div className="composer-actions">
              <button onClick={() => window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'analysis'}}))}>📊 Análise</button>
              <button onClick={() => window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'game'}}))}>⚽ Jogo</button>
              <button onClick={() => window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'image'}}))}>📷 Imagem</button>
              <button className="publish-btn" onClick={() => window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'analysis'}}))}>Publicar</button>
            </div>
          </>
        ) : (
          <div className="guest-composer">
            <div>
              <strong>Quer compartilhar algo?</strong>
              <span>Entre ou crie sua conta para publicar análises, jogos e fotos.</span>
            </div>
            <button
              className="publish-btn"
              onClick={() => window.dispatchEvent(new Event('gambly:open-login'))}
            >
              Entrar
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card loading">Carregando seu feed...</div>
      ) : posts.length ? (
        posts.map(p => <PostCard key={p.id} post={p} />)
      ) : (
        <div className="card empty">
          <b>Seu feed está pronto.</b>
          <span>Publique a primeira análise ou siga outros apostadores para personalizá-lo.</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('gambly:compose',{detail:{mode:'analysis'}}))}>
            Criar publicação
          </button>
        </div>
      )}

      {more && <button className="load-more" onClick={load}>Carregar mais</button>}
    </section>
  );
}
