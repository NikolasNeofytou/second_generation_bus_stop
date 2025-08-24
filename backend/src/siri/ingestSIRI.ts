import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { pool, redisClient } from '../db';

const SIRI_URL = process.env.SIRI_URL || '';
const SIRI_HEADERS = process.env.SIRI_HEADERS ? JSON.parse(process.env.SIRI_HEADERS) as Record<string,string> : undefined;
const SIRI_METHOD = (process.env.SIRI_METHOD || 'GET').toUpperCase(); // GET | SOAP_VM
const SIRI_SOAP_ACTION = process.env.SIRI_SOAP_ACTION; // optional; defaulted per op
const SIRI_OPERATION = (process.env.SIRI_OPERATION || 'VehicleMonitoring');
const SIRI_SOAP_BODY = process.env.SIRI_SOAP_BODY; // optional manual override
const SIRI_DEBUG = (process.env.SIRI_DEBUG || 'false').toLowerCase() === 'true';
const SIRI_REQUESTOR_REF = process.env.SIRI_REQUESTOR_REF || 'demo';
const SIRI_LINE_REF = process.env.SIRI_LINE_REF; // optional filter
const SIRI_OPERATOR_REF = process.env.SIRI_OPERATOR_REF; // optional filter
if (!SIRI_URL) {
  console.error('SIRI_URL environment variable not set');
  process.exit(1);
}

// Resolve to backend/data regardless of running from src or dist
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

async function ensureDataDir() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
}

export async function ingestSIRI() {
  let url = SIRI_URL;
  // If someone passed an op=... URL (like ...SiriWS.asmx?op=GetEstimatedTimetable), strip query to base service endpoint
  try {
    const u = new URL(SIRI_URL);
    if (u.searchParams.get('op')) {
      u.search = '';
      url = u.toString();
    }
  } catch {}

  let res: Response;
  if (SIRI_METHOD === 'SOAP_VM') {
    const now = new Date().toISOString();
    const lineFilter = SIRI_LINE_REF ? `<LineRef>${SIRI_LINE_REF}</LineRef>` : '';
    const opFilter = SIRI_OPERATOR_REF ? `<OperatorRef>${SIRI_OPERATOR_REF}</OperatorRef>` : '';
    const opName = SIRI_OPERATION === 'EstimatedTimetable' ? 'GetEstimatedTimetable' : 'GetVehicleMonitoring';
    const defaultBody = SIRI_OPERATION === 'EstimatedTimetable'
      ? `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetEstimatedTimetable xmlns="http://www.siri.org.uk/siri">
      <Request>
        <RequestTimestamp>${now}</RequestTimestamp>
        <RequestorRef>${SIRI_REQUESTOR_REF}</RequestorRef>
        <MessageIdentifier>${Date.now()}</MessageIdentifier>
        ${lineFilter}
        ${opFilter}
      </Request>
    </GetEstimatedTimetable>
  </soap:Body>
</soap:Envelope>`
      : `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetVehicleMonitoring xmlns="http://www.siri.org.uk/siri">
      <Request>
        <RequestTimestamp>${now}</RequestTimestamp>
        <RequestorRef>${SIRI_REQUESTOR_REF}</RequestorRef>
        <MessageIdentifier>${Date.now()}</MessageIdentifier>
        ${lineFilter}
        ${opFilter}
        <VehicleMonitoringRef>All</VehicleMonitoringRef>
      </Request>
    </GetVehicleMonitoring>
  </soap:Body>
</soap:Envelope>`;
    const body = SIRI_SOAP_BODY || defaultBody;
    // Resolve SOAPAction, possibly by fetching the op help page
    let soapAction = SIRI_SOAP_ACTION;
    if (!soapAction) {
      try {
        const helpUrl = `${url}?op=${opName}`;
        const helpRes = await fetch(helpUrl);
        if (helpRes.ok) {
          const help = await helpRes.text();
          const m = help.match(/SOAPAction:\s*&quot;([^&]+)&quot;|SOAPAction:\s*"([^"]+)"/i);
          soapAction = (m?.[1] || m?.[2])?.trim();
          if (SIRI_DEBUG) console.log('Discovered SOAPAction:', soapAction);
        }
      } catch (e) {
        if (SIRI_DEBUG) console.warn('Failed to discover SOAPAction:', e);
      }
    }
    if (!soapAction) soapAction = `http://www.siri.org.uk/siri/${opName}`;
    const headers: Record<string, string> = {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': soapAction,
      ...(SIRI_HEADERS || {}),
    };
    res = await fetch(url, { method: 'POST', headers, body });
  } else {
    res = await fetch(url, { headers: SIRI_HEADERS });
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch SIRI: ${res.status} ${res.statusText}${errText ? `\n${errText.substring(0, 800)}` : ''}`);
  }
  const text = await res.text();
  if (SIRI_DEBUG) console.log('SIRI raw (first 500 chars):', text.substring(0, 500));
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', allowBooleanAttributes: true });
  const siri = parser.parse(text);

  // Attempt to locate VehicleMonitoringDelivery
  // SIRI can be nested: Siri.ServiceDelivery.VehicleMonitoringDelivery
  const service = siri?.Envelope?.Body?.Siri?.ServiceDelivery || siri?.Siri?.ServiceDelivery || siri?.Siri?.serviceDelivery || siri?.ServiceDelivery;
  const vmd = service?.VehicleMonitoringDelivery || service?.vehicleMonitoringDelivery || [];
  const deliveries = Array.isArray(vmd) ? vmd : [vmd];
  const etd = service?.EstimatedTimetableDelivery || service?.estimatedTimetableDelivery || [];

  const vehicles: any[] = [];
  for (const d of deliveries) {
    const activities = d?.VehicleActivity || d?.vehicleActivity || [];
    const arr = Array.isArray(activities) ? activities : [activities];
    for (const a of arr) {
      const mvj = a?.MonitoredVehicleJourney || a?.monitoredVehicleJourney;
      const vp = mvj?.VehicleLocation || mvj?.vehicleLocation;
      if (!vp) continue;
      const id = mvj?.VehicleRef || mvj?.vehicleRef || a?.VehicleRef || a?.vehicleRef;
      const lat = Number(vp?.Latitude ?? vp?.latitude);
      const lon = Number(vp?.Longitude ?? vp?.longitude);
      const bearing = Number(mvj?.Bearing ?? mvj?.bearing ?? a?.Bearing ?? a?.bearing ?? NaN);
      const recordedAtTime = a?.RecordedAtTime || a?.recordedAtTime;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      vehicles.push({ id: String(id ?? ''), lat, lon, bearing: Number.isFinite(bearing) ? bearing : undefined, timestamp: recordedAtTime ? Date.parse(recordedAtTime) : undefined });
    }
  }

  if (vehicles.length === 0 && (Array.isArray(etd) ? etd.length : (etd ? 1 : 0))) {
    console.warn('SIRI EstimatedTimetable delivery present but contains no vehicle positions. Use VehicleMonitoring for live positions.');
  }

  // Optional alerts from SIRI (ServiceAlerts/GeneralMessage). If not present, leave empty.
  const alerts: any[] = [];

  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM vehicles');
        if (vehicles.length) {
          const values: string[] = [];
          const params: any[] = [];
          let i = 1;
          for (const v of vehicles) {
            values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
            params.push(v.id, v.lat, v.lon, v.bearing ?? null, v.timestamp ?? null);
          }
          await client.query(
            `INSERT INTO vehicles (id, lat, lon, bearing, timestamp) VALUES ${values.join(',')}`,
            params
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Failed to persist vehicles to DB:', err);
    }
  }

  if (redisClient) {
    try {
      await redisClient.set('vehicles', JSON.stringify(vehicles), { EX: 30 });
    } catch (err) {
      console.error('Failed to cache vehicles in Redis:', err);
    }
  }

  await ensureDataDir();
  await fs.promises.writeFile(path.join(DATA_DIR, 'vehicles.json'), JSON.stringify(vehicles, null, 2));
  await fs.promises.writeFile(path.join(DATA_DIR, 'alerts.json'), JSON.stringify(alerts, null, 2));
  console.log(`Ingested ${vehicles.length} vehicles from SIRI.`);
}

if (require.main === module) {
  ingestSIRI().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
