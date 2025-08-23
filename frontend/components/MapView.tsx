import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'next-i18next';

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

const DEFAULT_CENTER: [number, number] = [35.1264, 33.4299];

export default function MapView() {
  const { t } = useTranslation('common');
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch('http://localhost:3001/vehicles');
        if (res.ok) {
          setVehicles(await res.json());
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

  return (
    <>
      {vehicles === null && <p>{t('loadingVehicles')}</p>}
      {vehicles !== null && vehicles.length === 0 && (
        <p>{t('noVehicles')}</p>
      )}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={10}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {vehicles &&
          vehicles.map((v) => (
            <Marker key={v.id} position={[v.lat, v.lon]}>
              <Popup>{v.id}</Popup>
            </Marker>
          ))}
      </MapContainer>
    </>
  );
}
