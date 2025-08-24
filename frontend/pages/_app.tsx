import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import setLanguage from 'next-translate/setLanguage';
import { useRouter } from 'next/router';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('locale') : null;
    if (stored && stored !== router.locale) {
      setLanguage(stored);
    }
  }, [router.locale]);

  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (storedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', next);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
