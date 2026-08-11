'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { RightRail } from '@/components/RightRail';
import { AuthModal } from '@/components/AuthModal';
import { ComposerModal } from '@/components/ComposerModal';
import { ProfileEditorModal } from '@/components/ProfileEditorModal';
import { getMe } from '@/lib/api';
import type { User } from '@/types';

const labels: Record<string, string> = {
  '/': 'Início', '/live': 'Ao vivo', '/explore': 'Explorar', '/profile': 'Perfil',
  '/history': 'Histórico', '/stats': 'Estatísticas', '/ranking': 'Ranking',
  '/notifications': 'Notificações', '/messages': 'Mensagens', '/communities': 'Comunidades',
  '/premium': 'Grupos Premium',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [login, setLogin] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [compose, setCompose] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [composeMode, setComposeMode] = useState<'analysis' | 'game' | 'image' | 'prediction'>('analysis');

  useEffect(() => {
    // Do not overwrite an already selected theme on navigation/hydration.
    // Dark is the default only when there is no saved choice.
    const saved = localStorage.getItem('gambly-theme');
    const current = document.documentElement.dataset.theme;
    const initial = saved === 'light' || saved === 'dark'
      ? saved
      : (current === 'light' || current === 'dark' ? current : 'dark');

    if (document.documentElement.dataset.theme !== initial) {
      document.documentElement.dataset.theme = initial;
    }
    document.documentElement.style.colorScheme = initial;
    if (!saved) localStorage.setItem('gambly-theme', initial);

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'gambly-theme' && (event.newValue === 'light' || event.newValue === 'dark')) {
        document.documentElement.dataset.theme = event.newValue;
        window.dispatchEvent(new Event('gambly:theme-change'));
      }
    };
    window.addEventListener('storage', onStorage);

    getMe().then(r => setUser(r.user)).catch(() => setUser(null)).finally(() => setAuthReady(true));

    const openCompose = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setComposeMode(detail?.mode || 'analysis');
      setCompose(true);
    };
    const refreshAuth = () => getMe().then(r => setUser(r.user)).catch(() => setUser(null));
    const openProfileEdit = () => setProfileEdit(true);
    const openLoginEvent = () => openAuth('login');
    window.addEventListener('gambly:compose', openCompose);
    window.addEventListener('gambly:auth-refresh', refreshAuth);
    window.addEventListener('gambly:profile-edit', openProfileEdit);
    window.addEventListener('gambly:open-login', openLoginEvent);
    return () => {
      window.removeEventListener('gambly:compose', openCompose);
      window.removeEventListener('gambly:auth-refresh', refreshAuth);
      window.removeEventListener('gambly:profile-edit', openProfileEdit);
      window.removeEventListener('gambly:open-login', openLoginEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const active = labels[pathname] || 'Início';
  const openAuth = (mode: 'login' | 'register') => { setAuthMode(mode); setLogin(true); };

  return (
    <>
      <Header
        user={user}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
        onLoggedOut={() => setUser(null)}
      />
      <div className="shell">
        <Sidebar active={active} authenticated={Boolean(user)} />
        <main className="main-content">{children}</main>
        <RightRail user={user} authReady={authReady} onLogin={() => openAuth('login')} />
      </div>
      <AuthModal
        open={login}
        initialMode={authMode}
        onClose={() => setLogin(false)}
        onAuthenticated={(nextUser) => { setUser(nextUser); setLogin(false); }}
      />
      <ComposerModal
        open={compose}
        initialMode={composeMode}
        user={user}
        onClose={() => setCompose(false)}
      />
      <ProfileEditorModal open={profileEdit} user={user} onClose={()=>setProfileEdit(false)} onSaved={next=>setUser(next)} />
    </>
  );
}
