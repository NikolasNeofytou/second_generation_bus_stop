import React, { useState } from 'react';
import useTranslation from 'next-translate/useTranslation';

interface Stop {
  id: string;
  name: string;
}

interface Props {
  stops: Stop[];
}

const StopSearch: React.FC<Props> = ({ stops }) => {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');

  const results = stops.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <ul>
        {results.map(stop => (
          <li key={stop.id}>{stop.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default StopSearch;
