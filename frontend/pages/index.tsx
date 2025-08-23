import Head from 'next/head';
import React from 'react';
import AlertsBanner from '../components/AlertsBanner';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Cyprus Bus Stop</title>
      </Head>
      <AlertsBanner />
      <main>
        <h1>Cyprus Bus Stop App</h1>
        <MapView />
      </main>
    </>
  );
}
