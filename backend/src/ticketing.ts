import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(__dirname, '..', 'data');
const KEYS_FILE = path.join(DATA_DIR, 'ticket_keys.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const VALIDATIONS_FILE = path.join(DATA_DIR, 'validations.json');

type KeyPair = { publicKeyPem: string; privateKeyPem: string };

export interface Ticket {
  id: string;
  userId: string;
  fareId: string;
  issuedAt: number;
  validFrom: number;
  validTo: number;
  nonce: string;
  payload: Record<string, any>;
  signature: string; // base64
  status: 'active' | 'revoked' | 'used' | 'expired';
}

interface PurchaseBody {
  userId: string;
  fareId: string;
  validityMinutes?: number;
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(file: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureKeys(): KeyPair {
  ensureDir();
  const existing = loadJson<KeyPair | null>(KEYS_FILE, null);
  if (existing && existing.privateKeyPem && existing.publicKeyPem) return existing;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const kp: KeyPair = {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
  saveJson(KEYS_FILE, kp);
  return kp;
}

function signPayload(privateKeyPem: string, payload: object): string {
  const data = Buffer.from(JSON.stringify(payload));
  const key = crypto.createPrivateKey({ key: privateKeyPem, format: 'pem' });
  const sig = crypto.sign(null, data, key); // ed25519 ignores hash algorithm param
  return sig.toString('base64');
}

export const ticketsRouter = express.Router();

ticketsRouter.get('/public-key', (_req: Request, res: Response) => {
  const kp = ensureKeys();
  res.json({ publicKeyPem: kp.publicKeyPem });
});

// Purchase a ticket (dev/demo flow; no PSP yet)
ticketsRouter.post('/purchase', (req: Request, res: Response) => {
  const { userId, fareId, validityMinutes }: PurchaseBody = req.body || {};
  if (!userId || !fareId) return res.status(400).json({ error: 'userId and fareId are required' });
  const kp = ensureKeys();
  const now = Date.now();
  const validFrom = now;
  const validTo = now + (Math.max(1, validityMinutes || 90) * 60 * 1000);
  const id = `t_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = { tID: id, userHash: crypto.createHash('sha256').update(userId).digest('hex'), fareId, issuedAt: now, validFrom, validTo, nonce };
  const signature = signPayload(kp.privateKeyPem, payload);
  const ticket: Ticket = { id, userId, fareId, issuedAt: now, validFrom, validTo, nonce, payload, signature, status: 'active' };

  const tickets = loadJson<Ticket[]>(TICKETS_FILE, []);
  tickets.push(ticket);
  ensureDir();
  saveJson(TICKETS_FILE, tickets);
  res.status(201).json(ticket);
});

ticketsRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const tickets = loadJson<Ticket[]>(TICKETS_FILE, []);
  const t = tickets.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

// Basic validation (dev): verify signature and time window; record validation
ticketsRouter.post('/validate', (req: Request, res: Response) => {
  const { id, nonce }: { id: string; nonce?: string } = req.body || {};
  const tickets = loadJson<Ticket[]>(TICKETS_FILE, []);
  const t = tickets.find(x => x.id === id);
  if (!t) return res.status(404).json({ valid: false, reason: 'not_found' });
  const kp = ensureKeys();
  // Verify signature
  const data = Buffer.from(JSON.stringify(t.payload));
  const pub = crypto.createPublicKey({ key: kp.publicKeyPem, format: 'pem' });
  const ok = crypto.verify(null, data, pub, Buffer.from(t.signature, 'base64'));
  if (!ok) return res.status(200).json({ valid: false, reason: 'bad_signature' });
  const now = Date.now();
  if (now < t.validFrom) return res.status(200).json({ valid: false, reason: 'not_yet_valid' });
  if (now > t.validTo) return res.status(200).json({ valid: false, reason: 'expired' });
  if (t.status !== 'active') return res.status(200).json({ valid: false, reason: t.status });
  // Optional nonce check to prevent replay
  const validations = loadJson<any[]>(VALIDATIONS_FILE, []);
  const seen = nonce && validations.find(v => v.id === id && v.nonce === nonce);
  if (seen) return res.status(200).json({ valid: false, reason: 'replay' });
  validations.push({ id, time: now, nonce: nonce || null });
  ensureDir();
  saveJson(VALIDATIONS_FILE, validations);
  res.json({ valid: true });
});

// Revoke a ticket
ticketsRouter.post('/:id/revoke', (req: Request, res: Response) => {
  const { id } = req.params;
  const tickets = loadJson<Ticket[]>(TICKETS_FILE, []);
  const idx = tickets.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  tickets[idx].status = 'revoked';
  ensureDir();
  saveJson(TICKETS_FILE, tickets);
  res.json(tickets[idx]);
});
