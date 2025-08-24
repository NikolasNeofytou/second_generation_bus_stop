import Head from 'next/head';
import React from 'react';
import dynamic from 'next/dynamic';
import useTranslation from 'next-translate/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';
import AlertsBanner from '../components/AlertsBanner';
import StopSearch from '../components/StopSearch';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

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
        <LanguageSwitcher />
        <StopSearch stops={[]} />
        <MapView />
      </main>
    </>
  );
}
