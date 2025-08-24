import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const currentlyDark = stored ? stored === 'dark' : document.documentElement.classList.contains('dark');
    setIsDark(currentlyDark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
      onClick={toggle}
      aria-label="Toggle theme"
      type="button"
    >
      <span>{isDark ? '🌙' : '🌞'}</span>
      <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
