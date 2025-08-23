import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('locale') : null;
    if (stored && stored !== router.locale) {
      router.replace(router.asPath, router.asPath, { locale: stored });
    }
  }, [router]);

  return <Component {...pageProps} />;
}

export default appWithTranslation(MyApp);
