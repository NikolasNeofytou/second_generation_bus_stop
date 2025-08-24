import Head from 'next/head';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import useTranslation from 'next-translate/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';
import AlertsBanner from '../components/AlertsBanner';
import StopSearch from '../components/StopSearch';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export default function Home() {
  const { t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);
  const [stops, setStops] = useState<{ id: string; name: string }[]>([]);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const fetchStops = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/stops`);
        if (!res.ok) return;
        const rows = await res.json();
        const mapped = rows.map((r: any) => ({ id: r.stop_id || r.id, name: r.stop_name || r.name }));
        setStops(mapped);
      } catch (e) {
        // noop
      }
    };
    fetchStops();
  }, []);
  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {t('heading')}
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <AlertsBanner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
            <StopSearch stops={stops} />
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Alerts</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('comingSoon')}</p>
          </div>
        </section>
        <section className="lg:col-span-2">
          {mounted && <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
            <MapView />
          </div>}
        </section>
      </main>
    </>
  );
}
