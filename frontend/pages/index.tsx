import Head from 'next/head';
import React from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Home() {
  const { t } = useTranslation('common');
  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
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
