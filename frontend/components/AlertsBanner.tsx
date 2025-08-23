import React, { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Alert {
  id: string;
  header?: string;
  description?: string;
  url?: string;
}

export default function AlertsBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/alerts`)
      .then(res => res.json())
      .then(setAlerts)
      .catch(err => console.error('Failed to load alerts', err));
  }, []);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div style={{ backgroundColor: '#ffecb3', padding: '0.5rem' }}>
      {alerts.map(alert => (
        <div key={alert.id}>
          <strong>{alert.header}</strong> {alert.description}
        </div>
      ))}
    </div>
  );
}
