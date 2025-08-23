import React, { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Stop {
  stop_id: string;
  stop_name: string;
}

export default function StopSearch() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/stops`)
      .then(res => res.json())
      .then(setStops)
      .catch(err => console.error('Failed to load stops', err));

    const fav = localStorage.getItem('favoriteStops');
    if (fav) setFavorites(JSON.parse(fav));
  }, []);

  const toggleFavorite = (stopId: string) => {
    let updated: string[];
    if (favorites.includes(stopId)) {
      updated = favorites.filter(id => id !== stopId);
    } else {
      updated = [...favorites, stopId];
    }
    setFavorites(updated);
    localStorage.setItem('favoriteStops', JSON.stringify(updated));
  };

  const filtered = stops.filter(s =>
    s.stop_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Search stops..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
      />

      {favorites.length > 0 && (
        <div>
          <h3>Favourites</h3>
          <ul>
            {favorites.map(id => {
              const stop = stops.find(s => s.stop_id === id);
              return stop ? (
                <li key={id}>
                  {stop.stop_name}
                  <button onClick={() => toggleFavorite(id)}>★</button>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      )}

      <ul>
        {filtered.map(stop => (
          <li key={stop.stop_id}>
            {stop.stop_name}{' '}
            <button onClick={() => toggleFavorite(stop.stop_id)}>
              {favorites.includes(stop.stop_id) ? '★' : '☆'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
