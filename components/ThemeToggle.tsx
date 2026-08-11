'use client';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const sync = () => {
      const value = document.documentElement.dataset.theme;
      setTheme(value === 'light' ? 'light' : 'dark');
    };

    sync();
    window.addEventListener('gambly:theme-change', sync);
    return () => window.removeEventListener('gambly:theme-change', sync);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';

    // Update the root immediately. No page reload and no navigation is needed.
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('gambly-theme', next);
    setTheme(next);
    window.dispatchEvent(new Event('gambly:theme-change'));
  }

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      {theme === 'dark' ? '☼' : '☾'}
    </button>
  );
}
