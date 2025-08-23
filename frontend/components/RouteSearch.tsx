import React, { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
}

export default function RouteSearch() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`${BACKEND_URL}/routes`)
      .then(res => res.json())
      .then(setRoutes)
      .catch(err => console.error('Failed to load routes', err));
  }, []);

  const filtered = routes.filter(r =>
    (r.route_short_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (r.route_long_name || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Search routes..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
      />
      <ul>
        {filtered.map(route => (
          <li key={route.route_id}>
            {route.route_short_name || route.route_id} - {route.route_long_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
