import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Vehicle {
  id: string;
  lat: number;
  lon: number;
  routeId: string;
}

export default function MapView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/vehicles`);
        if (res.ok) {
          const data = await res.json();
          setVehicles(data);
        }
      } catch (err) {
        console.error('Failed to fetch vehicles', err);
      }
    };

    fetchVehicles();
    const id = setInterval(fetchVehicles, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <MapContainer center={[35.1856, 33.3823]} zoom={12} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {vehicles.map((v) => (
        <Marker key={v.id} position={[v.lat, v.lon]}>
          <Popup>
            Route {v.routeId}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
