import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Alert {
  id: string;
  header?: string;
  description?: string;
  url?: string;
}

export default function AlertsBanner() {
  const { t } = useTranslation('common');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const url = `${BACKEND_URL}/alerts`;
    fetch(url)
      .then((res) => {
        setStale(res.headers.get('X-Cache') === 'HIT');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(setAlerts)
      .catch((err) => {
        console.error(`Failed to load alerts from ${url}:`, err);
        setAlertsError('Could not load alerts. Please try again later.');
        setStale(true);
      });
  }, []);

  if (alertsError) {
    return (
      <div style={{ backgroundColor: '#ffcccc', padding: '0.5rem', color: '#900' }}>
        {alertsError}
      </div>
    );
  }
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div style={{ backgroundColor: '#ffecb3', padding: '0.5rem' }}>
      {stale && <div style={{ color: '#900' }}>{t('offlineData')}</div>}
      {alerts.map((alert) => (
        <div key={alert.id}>
          <strong>{alert.header}</strong> {alert.description}
        </div>
      ))}
    </div>
  );
}
