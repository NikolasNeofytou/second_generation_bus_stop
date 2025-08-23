import Head from 'next/head';
import React from 'react';
import AlertsBanner from '../components/AlertsBanner';

export default function Home() {
  return (
    <>
      <Head>
        <title>Cyprus Bus Stop</title>
      </Head>
      <AlertsBanner />
      <main>
        <h1>Cyprus Bus Stop App</h1>
        <p>Coming soon...</p>
      </main>
    </>
  );
}
