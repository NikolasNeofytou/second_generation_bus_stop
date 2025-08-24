import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

type Ticket = {
  id: string;
  userId: string;
  fareId: string;
  issuedAt: number;
  validFrom: number;
  validTo: number;
  nonce: string;
  payload: Record<string, any>;
  signature: string;
  status: 'active' | 'revoked' | 'used' | 'expired';
};

export default function TicketViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const idStr = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!idStr) return;
    setLoading(true); setError(null);
    fetch(`${BACKEND_URL}/tickets/${idStr}`)
      .then(async r => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || 'Failed to load ticket');
        setTicket(data);
      })
      .catch(e => setError(e.message || 'Failed'))
      .finally(() => setLoading(false));
  }, [idStr]);

  const qrData = useMemo(() => {
    if (!ticket) return '';
    // Minimal QR: embed a compact JSON with id and signature; a real app may include entire payload
    const content = JSON.stringify({ id: ticket.id, sig: ticket.signature });
    // Use Google Chart API QR to avoid adding dependencies in this demo (public GET)
    const url = `https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=${encodeURIComponent(content)}`;
    return url;
  }, [ticket]);

  const fmt = (ms?: number) => (ms ? new Date(ms).toLocaleString() : '-');
  const isExpired = ticket ? Date.now() > ticket.validTo : false;

  const validate = async () => {
    if (!ticket) return;
    setValidating(true); setValidationMsg(null);
    try {
      const nonce = Math.random().toString(16).slice(2, 10);
      const res = await fetch(`${BACKEND_URL}/tickets/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticket.id, nonce })
      });
      const data = await res.json();
      if (data.valid) setValidationMsg('Valid ticket ✅');
      else setValidationMsg(`Invalid: ${data.reason || 'unknown'}`);
    } catch (e: any) {
      setValidationMsg(e.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const revoke = async () => {
    if (!ticket) return;
    setRevoking(true);
    try {
      const res = await fetch(`${BACKEND_URL}/tickets/${ticket.id}/revoke`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) setTicket(data);
      else setError(data?.error || 'Failed to revoke');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Your ticket</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {ticket && (
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <div className="flex items-center gap-4">
              {qrData && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrData} alt="Ticket QR" className="w-56 h-56 border rounded bg-white" />
              )}
              <div>
                <p><span className="font-medium">ID:</span> {ticket.id}</p>
                <p><span className="font-medium">Fare:</span> {ticket.fareId}</p>
                <p><span className="font-medium">Status:</span> {ticket.status}{isExpired ? ' (expired)' : ''}</p>
                <p><span className="font-medium">Valid:</span> {fmt(ticket.validFrom)} → {fmt(ticket.validTo)}</p>
              </div>
            </div>
          </div>
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Payload</h2>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">{JSON.stringify(ticket.payload, null, 2)}</pre>
          </div>
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Signature</h2>
            <code className="break-all text-xs">{ticket.signature}</code>
          </div>
          <div className="p-4 border rounded flex items-center gap-3">
            <button onClick={validate} disabled={validating} className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">{validating ? 'Validating…' : 'Validate now'}</button>
            <button onClick={revoke} disabled={revoking || ticket.status !== 'active'} className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50">{revoking ? 'Revoking…' : 'Revoke'}</button>
            {validationMsg && <span className="ml-2 text-sm">{validationMsg}</span>}
          </div>
          <div>
            <a className="text-blue-600 underline" href="/tickets/purchase">Buy another ticket</a>
          </div>
        </div>
      )}
    </div>
  );
}
