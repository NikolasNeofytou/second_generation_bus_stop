import Head from 'next/head';
import React from 'react';

import AlertsBanner from '../components/AlertsBanner';


export default function Home() {
  const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
      <AlertsBanner />
      <main>
        <h1>{t('heading')}</h1>
        <p>{t('comingSoon')}</p>
        <LanguageSwitcher />
      </main>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
