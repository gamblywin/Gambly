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
    window.addEventListener('gambly:auth-refresh', onAuthRefresh);

    return () => {
      alive = false;
      window.removeEventListener('gambly:auth-refresh', onAuthRefresh);
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
      <div className="stories card">
        <div className="section-head">
          <div>
            <h2>Stories</h2>
            <small>Veja o que a comunidade está fazendo</small>
          </div>
          <button>Ver todos →</button>
        </div>
        <div className="stories-row">
          {['Você','Rafa','Luiz','Camila','Bruno','Ana','Diego'].map((x,i) => (
            <button className="story" key={x}>
              <span className="story-ring">
                <span className="story-avatar">{i ? ' ' + x[0] : '+'}</span>
              </span>
              <b>{x}</b>
            </button>
          ))}
        </div>
      </div>

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

      <div className="feed-tabs card">
        <button className="active">Para você</button>
        <button>Seguindo</button>
        <button>Em alta</button>
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
