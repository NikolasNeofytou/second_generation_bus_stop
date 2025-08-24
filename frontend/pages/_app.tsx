import type { AppProps } from 'next/app';
import appWithI18n from 'next-translate/appWithI18n';
import i18nConfig from '../i18n';
import { useEffect } from 'react';
import setLanguage from 'next-translate/setLanguage';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('locale') : null;
    if (stored && stored !== router.locale) {
      setLanguage(stored);
    }
  }, [router.locale]);

  return <Component {...pageProps} />;
}

export default appWithI18n(MyApp, i18nConfig);
