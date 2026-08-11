'use client';
import { useEffect, useState } from 'react';
import { Feed } from '@/components/Feed';
import { getMe } from '@/lib/api';

export default function Home() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => { getMe().then(r => setName(r.user.name.split(' ')[0])).catch(() => {}); }, []);
  return (
    <>
      <div className="page-title">
        <div><span className="eyebrow">GAMBLY SOCIAL</span><h1>Seu feed</h1><p>{name ? `Olá, ${name}. Bet. Share. Win.` : 'Olá! Explore o GAMBLY e acompanhe a comunidade.'}</p></div>
        <div className="connection"><i/> Sistema online</div>
      </div>
      <Feed />
    </>
  );
}
