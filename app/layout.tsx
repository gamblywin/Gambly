import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { MobileNav } from '@/components/MobileNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'GAMBLY — Bet. Share. Win.',
  description: 'Rede social esportiva para compartilhar análises e acompanhar jogos.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          (function(){
            try {
              var t = localStorage.getItem('gambly-theme');
              var theme = (t === 'light' || t === 'dark') ? t : 'dark';
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.colorScheme = theme;
            } catch(e) {
              document.documentElement.dataset.theme = 'dark';
              document.documentElement.style.colorScheme = 'dark';
            }
          })();
        `}} />
      </head>
      <body><AppShell>{children}</AppShell><MobileNav /></body></html>;
}
