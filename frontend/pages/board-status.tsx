import { useEffect, useState } from 'react';

interface BoardStatus {
  uptime: number;
  firmwareVersion: string;
  timestamp: number;
}

export default function BoardStatusPage() {
  const [statuses, setStatuses] = useState<BoardStatus[]>([]);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${BACKEND_URL}/board-status`)
      .then((res) => res.json())
      .then(setStatuses)
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Board Status</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime (s)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firmware Version</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-100 dark:divide-gray-900">
            {statuses.map((s, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm">{s.uptime}</td>
                <td className="px-4 py-2 text-sm">{s.firmwareVersion}</td>
                <td className="px-4 py-2 text-sm">{new Date(s.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
