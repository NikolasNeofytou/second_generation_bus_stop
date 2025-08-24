import React, { useEffect, useState } from 'react';
import useTranslation from 'next-translate/useTranslation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Alert {
  id: string;
  headerTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  url?: string;
}

export default function AlertsBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const { t, lang } = useTranslation('common');

  useEffect(() => {
    const url = `${BACKEND_URL}/alerts`;
    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(setAlerts)
      .catch(err => {
        console.error(`Failed to load alerts from ${url}:`, err);
        setAlertsError(t('alertsError'));
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
      {alerts.map(alert => (
        <div key={alert.id}>
          <strong>{alert.headerTranslations?.[lang] || alert.headerTranslations?.['en']}</strong>
          {' '}
          {alert.descriptionTranslations?.[lang] ||
            alert.descriptionTranslations?.['en']}
        </div>
      ))}
    </div>
  );
}
