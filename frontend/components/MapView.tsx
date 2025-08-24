// @ts-nocheck
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useTranslation from 'next-translate/useTranslation';

delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Vehicle {
  id: string;
  lat: number;
  lon: number;
}

interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}
interface Shape {
  shape_id: string;
  points: { lat: number; lon: number }[];
}

const DEFAULT_CENTER: [number, number] = [35.1264, 33.4299];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function MapView() {
  const { t } = useTranslation('common');
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  // Animated vehicle positions updated per-frame
  const [animatedPositions, setAnimatedPositions] = useState<Record<string, { lat: number; lon: number }>>({});
  const prevSnapshot = useRef<Record<string, { lat: number; lon: number }>>({});
  const animTarget = useRef<Record<string, { lat: number; lon: number }>>({});
  const animStart = useRef<number>(0);
  const animDuration = useRef<number>(10000); // match fetch interval
  const rafId = useRef<number | null>(null);
  const [stops, setStops] = useState<Stop[] | null>(null);
  const [shapes, setShapes] = useState<Shape[] | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/vehicles`);
        if (res.ok) {
          const data: Vehicle[] = await res.json();
          setVehicles(data);
          // Prepare animation from previous snapshot to new targets
          const now = performance.now();
          animStart.current = now;
          const prev = prevSnapshot.current;
          const next: Record<string, { lat: number; lon: number }> = {};
          for (const v of data) next[v.id] = { lat: v.lat, lon: v.lon };
          // Ensure starting positions exist
          const startPositions: Record<string, { lat: number; lon: number }> = {};
          for (const id of Object.keys(next)) {
            startPositions[id] = prev[id] ?? next[id];
          }
          prevSnapshot.current = startPositions;
          animTarget.current = next;
          // Kick animation loop
          if (rafId.current !== null) cancelAnimationFrame(rafId.current);
          const tick = () => {
            const t = performance.now();
            const progress = Math.min(1, (t - animStart.current) / animDuration.current);
            const out: Record<string, { lat: number; lon: number }> = {};
            for (const id of Object.keys(animTarget.current)) {
              const from = prevSnapshot.current[id] || animTarget.current[id];
              const to = animTarget.current[id];
              const lat = from.lat + (to.lat - from.lat) * progress;
              const lon = from.lon + (to.lon - from.lon) * progress;
              out[id] = { lat, lon };
            }
            setAnimatedPositions(out);
            if (progress < 1) {
              rafId.current = requestAnimationFrame(tick);
            } else {
              // End of animation: set snapshot to targets for next round
              prevSnapshot.current = animTarget.current;
              rafId.current = null;
            }
          };
          rafId.current = requestAnimationFrame(tick);
        } else {
          setVehicles([]);
        }
      } catch {
        setVehicles([]);
      }
    };
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStops = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/stops`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Stop[] = (data || []).map((s: any) => ({
            id: s.stop_id || s.id,
            name: s.stop_name || s.name,
            lat: parseFloat(s.stop_lat ?? s.lat),
            lon: parseFloat(s.stop_lon ?? s.lon),
          })).filter((s: Stop) => Number.isFinite(s.lat) && Number.isFinite(s.lon));
          setStops(mapped);
        } else {
          setStops([]);
        }
      } catch {
        setStops([]);
      }
    };
    fetchStops();
  }, []);

  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/shapes`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Shape[] = (data || [])
            .slice(0, 50) // limit for performance
            .map((s: any) => ({
              shape_id: s.shape_id,
              points: (s.points || [])
                .filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
                .map((p: any) => ({ lat: Number(p.lat), lon: Number(p.lon) })),
            }));
          setShapes(mapped);
        } else {
          setShapes([]);
        }
      } catch {
        setShapes([]);
      }
    };
    fetchShapes();
  }, []);

  return (
    <>
      {vehicles === null && <p className="p-3 text-sm text-gray-600 dark:text-gray-300">{t('loadingVehicles')}</p>}
      {vehicles !== null && vehicles.length === 0 && (
        <p className="p-3 text-sm text-gray-600 dark:text-gray-300">{t('noVehicles')}</p>
      )}
      {(() => {
        const mapProps: any = {
          center: DEFAULT_CENTER as unknown as LatLngExpression,
          zoom: 10,
          className: 'map-container w-full',
        };
        return (
          <MapContainer {...mapProps}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {shapes &&
              shapes.map((s) => (
                <Polyline
                  key={`shape-${s.shape_id}`}
                  pathOptions={{ color: '#2563eb', weight: 2, opacity: 0.6 }}
                  positions={s.points.map((p) => [p.lat, p.lon]) as unknown as LatLngExpression[]}
                />
              ))}

            {vehicles &&
              vehicles.map((v) => {
                const pos = animatedPositions[v.id] ?? { lat: v.lat, lon: v.lon };
                return (
                  <Marker key={v.id} position={[pos.lat, pos.lon] as unknown as LatLngExpression}>
                  <Popup>{v.id}</Popup>
                  </Marker>
                );
              })}
            {stops &&
              stops.map((s) => (
                <Marker key={`stop-${s.id}`} position={[s.lat, s.lon] as unknown as LatLngExpression}>
                  <Popup>{s.name}</Popup>
                </Marker>
              ))}
          </MapContainer>
        );
      })()}

    </>
  );
}
