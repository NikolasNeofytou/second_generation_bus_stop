import Head from 'next/head';
import React from 'react';

import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LanguageSwitcher from '../components/LanguageSwitcher';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });






export default function Home() {
  const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
      <main>
        <h1>{t('heading')}</h1>

        <LanguageSwitcher />
        <MapView />

        
        

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
