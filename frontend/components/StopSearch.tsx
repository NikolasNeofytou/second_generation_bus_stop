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
      <div className="relative">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {results.length > 0 && (
        <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          {results.map(stop => (
            <li key={stop.id} className="px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
              {stop.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StopSearch;
