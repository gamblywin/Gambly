'use client';
import Link from 'next/link';
export function MobileNav(){
  return <nav className="mobile-nav">
    <Link href="/"><span>⌂</span><small>Feed</small></Link>
    <Link href="/live"><span>⚡</span><small>Ao vivo</small></Link>
    <button onClick={()=>window.dispatchEvent(new Event('gambly:compose'))}><span>＋</span><small>Publicar</small></button>
    <Link href="/notifications"><span>♧</span><small>Alertas</small></Link>
    <Link href="/profile"><span>♙</span><small>Perfil</small></Link>
  </nav>
}
