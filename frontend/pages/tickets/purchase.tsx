import { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function PurchaseTicketPage() {
  const [userId, setUserId] = useState('demo-user');
  const [fareId, setFareId] = useState('single');
  const [validity, setValidity] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setTicketId(null);
    try {
      const res = await fetch(`${BACKEND_URL}/tickets/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fareId, validityMinutes: validity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to purchase');
      setTicketId(data.id);
    } catch (err: any) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Buy ticket</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">User ID</label>
          <input className="w-full border rounded px-3 py-2" value={userId} onChange={e=>setUserId(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Fare</label>
          <select className="w-full border rounded px-3 py-2" value={fareId} onChange={e=>setFareId(e.target.value)}>
            <option value="single">Single</option>
            <option value="day">Day Pass</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Validity (minutes)</label>
          <input type="number" min={1} className="w-full border rounded px-3 py-2" value={validity} onChange={e=>setValidity(parseInt(e.target.value||'0',10))} />
        </div>
        <button disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" type="submit">
          {loading ? 'Processing…' : 'Purchase'}
        </button>
      </form>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {ticketId && (
        <div className="mt-6 p-4 border rounded">
          <p className="mb-2">Ticket created.</p>
          <a className="text-blue-600 underline" href={`/tickets/${encodeURIComponent(ticketId)}`}>View ticket</a>
        </div>
      )}
    </div>
  );
}
