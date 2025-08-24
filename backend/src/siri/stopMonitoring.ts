import 'dotenv/config';
import { XMLParser } from 'fast-xml-parser';

const SIRI_URL = process.env.SIRI_URL || '';
const SIRI_HEADERS = process.env.SIRI_HEADERS ? JSON.parse(process.env.SIRI_HEADERS) as Record<string,string> : undefined;
const SIRI_SERVICE_NS = process.env.SIRI_SERVICE_NS || 'http://tempuri.org/';
const SIRI_SOAP_VERSION = (process.env.SIRI_SOAP_VERSION || '1.1'); // 1.1 or 1.2
const SIRI_REQUESTOR_REF = process.env.SIRI_REQUESTOR_REF || 'demo';
const SIRI_DEBUG = (process.env.SIRI_DEBUG || 'false').toLowerCase() === 'true';

export interface StopArrival {
  lineRef?: string;
  directionRef?: string;
  destinationName?: string;
  expectedArrivalTime?: string;
  aimedArrivalTime?: string;
  vehicleId?: string;
  vehicleLat?: number;
  vehicleLon?: number;
}

export async function getStopMonitoring(stopCode: string): Promise<StopArrival[]> {
  if (!SIRI_URL) throw new Error('SIRI_URL not configured');
  let baseUrl = SIRI_URL;
  try {
    const u = new URL(SIRI_URL);
    if (u.searchParams.get('op')) { u.search = ''; baseUrl = u.toString(); }
  } catch {}

  const envelopeNs = SIRI_SOAP_VERSION === '1.2' ? 'http://www.w3.org/2003/05/soap-envelope' : 'http://schemas.xmlsoap.org/soap/envelope/';
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="${envelopeNs}">
  <soap:Body>
    <GetStopMonitoring xmlns="${SIRI_SERVICE_NS}">
      <request>
        <ServiceRequestInfo xmlns="">
          <RequestorRef>${SIRI_REQUESTOR_REF}</RequestorRef>
          <RequestTimestamp>${now}</RequestTimestamp>
        </ServiceRequestInfo>
        <Request version="2.0" xmlns="">
          <MonitoringRef xmlns="http://www.siri.org.uk/siri">${stopCode}</MonitoringRef>
          <MaximumStopVisits xmlns="http://www.siri.org.uk/siri">10</MaximumStopVisits>
          <StopMonitoringDetailLevel xmlns="http://www.siri.org.uk/siri">normal</StopMonitoringDetailLevel>
        </Request>
        <RequestExtension xmlns="" />
      </request>
    </GetStopMonitoring>
  </soap:Body>
</soap:Envelope>`;

  const headers: Record<string, string> = { ...(SIRI_HEADERS || {}) };
  if (SIRI_SOAP_VERSION === '1.2') {
    headers['Content-Type'] = 'application/soap+xml; charset=utf-8; action="http://tempuri.org/GetStopMonitoring"';
  } else {
    headers['Content-Type'] = 'text/xml; charset=utf-8';
    headers['SOAPAction'] = 'http://tempuri.org/GetStopMonitoring';
  }
  const res = await fetch(baseUrl, { method: 'POST', headers, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`StopMonitoring error ${res.status}: ${text.substring(0, 800)}`);
  if (SIRI_DEBUG) console.log('StopMonitoring raw (first 800 chars):', text.substring(0, 800));
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', allowBooleanAttributes: true });
  const xml = parser.parse(text);

  // Walk to StopMonitoringDelivery MonitoredStopVisit list
  const bodyNode = xml?.Envelope?.Body || xml?.['soap:Envelope']?.['soap:Body'] || xml?.['soap12:Envelope']?.['soap12:Body'] || xml?.Body;
  const result = bodyNode?.GetStopMonitoringResponse?.GetStopMonitoringResult || bodyNode?.['GetStopMonitoringResponse']?.['GetStopMonitoringResult'];
  const answer = result?.Answer || result?.answer || result;
  const smd = answer?.StopMonitoringDelivery || answer?.stopMonitoringDelivery || [];
  const deliveries = Array.isArray(smd) ? smd : [smd];
  const arrivals: StopArrival[] = [];
  for (const d of deliveries) {
    const visits = d?.MonitoredStopVisit || d?.monitoredStopVisit || [];
    const arr = Array.isArray(visits) ? visits : [visits];
    for (const v of arr) {
      const mvj = v?.MonitoredVehicleJourney || v?.monitoredVehicleJourney || {};
      const call = mvj?.MonitoredCall || mvj?.monitoredCall || {};
      const loc = mvj?.VehicleLocation || mvj?.vehicleLocation || {};
      arrivals.push({
        lineRef: mvj?.LineRef || mvj?.lineRef,
        directionRef: mvj?.DirectionRef || mvj?.directionRef,
        destinationName: mvj?.DestinationName || mvj?.destinationName,
        aimedArrivalTime: call?.AimedArrivalTime || call?.aimedArrivalTime,
        expectedArrivalTime: call?.ExpectedArrivalTime || call?.expectedArrivalTime,
        vehicleId: mvj?.VehicleRef || mvj?.vehicleRef,
        vehicleLat: loc?.Latitude ? Number(loc.Latitude) : undefined,
        vehicleLon: loc?.Longitude ? Number(loc.Longitude) : undefined,
      });
    }
  }
  return arrivals;
}
