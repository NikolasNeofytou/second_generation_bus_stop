import Head from 'next/head';
import React from 'react';
import AlertsBanner from '../components/AlertsBanner';
import StopSearch from '../components/StopSearch';
import RouteSearch from '../components/RouteSearch';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Cyprus Bus Stop</title>
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <AlertsBanner />
      <main>
        <h1>Cyprus Bus Stop App</h1>
        <StopSearch />
        <RouteSearch />
        <MapView />
      </main>
    </>
  );
}
