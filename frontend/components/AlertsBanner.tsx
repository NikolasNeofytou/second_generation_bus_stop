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
      <div className="bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-y border-red-200 dark:border-red-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm">
          {alertsError}
        </div>
      </div>
    );
  }
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 border-y border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm space-y-1">
        {alerts.map(alert => (
          <div key={alert.id} className="flex items-start gap-2">
            <span className="font-semibold">
              {alert.headerTranslations?.[lang] || alert.headerTranslations?.['en']}
            </span>
            <span>
              {alert.descriptionTranslations?.[lang] || alert.descriptionTranslations?.['en']}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
