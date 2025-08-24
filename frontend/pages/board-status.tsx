import { useEffect, useState } from 'react';

interface BoardStatus {
  uptime: number;
  firmwareVersion: string;
  timestamp: number;
}

export default function BoardStatusPage() {
  const [statuses, setStatuses] = useState<BoardStatus[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/board-status')
      .then((res) => res.json())
      .then(setStatuses)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>Board Status</h1>
      <table>
        <thead>
          <tr>
            <th>Uptime (s)</th>
            <th>Firmware Version</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map((s, idx) => (
            <tr key={idx}>
              <td>{s.uptime}</td>
              <td>{s.firmwareVersion}</td>
              <td>{new Date(s.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
