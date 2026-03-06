import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RiderLocation } from '@/hooks/useOrderTracking';

interface DeliveryMapProps {
  riderLocation: RiderLocation;
  destinationLat: number;
  destinationLng: number;
  destinationLabel?: string;
}

const riderIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 36px; height: 36px;
    background: #16a34a;
    border: 3px solid white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    animation: pulse 2s infinite;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-2-2-3H9v6l-4 1v3c0 .6.4 1 1 1h1M6 17a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" stroke="white" stroke-width="1.5" fill="none"/>
    </svg>
  </div>
  <style>
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
      50% { box-shadow: 0 0 0 12px rgba(22, 163, 74, 0); }
    }
  </style>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 32px; height: 32px;
    background: #dc2626;
    border: 3px solid white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="white" stroke-width="1.5" fill="none"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapUpdater({ riderLat, riderLng }: { riderLat: number; riderLng: number }) {
  const map = useMap();

  useEffect(() => {
    map.panTo([riderLat, riderLng], { animate: true, duration: 1 });
  }, [map, riderLat, riderLng]);

  return null;
}

export function DeliveryMap({ riderLocation, destinationLat, destinationLng, destinationLabel }: DeliveryMapProps) {
  const riderLatLng: [number, number] = [riderLocation.latitude, riderLocation.longitude];
  const destLatLng: [number, number] = [destinationLat, destinationLng];

  const bounds = L.latLngBounds([riderLatLng, destLatLng]);

  return (
    <div className="h-[300px] md:h-[400px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={riderLatLng} icon={riderIcon}>
          <Popup>
            Rider is here
            {riderLocation.eta_minutes != null && (
              <span> &middot; ~{Math.round(riderLocation.eta_minutes)} min away</span>
            )}
          </Popup>
        </Marker>
        <Marker position={destLatLng} icon={destinationIcon}>
          <Popup>{destinationLabel || 'Delivery destination'}</Popup>
        </Marker>
        <MapUpdater riderLat={riderLocation.latitude} riderLng={riderLocation.longitude} />
      </MapContainer>
    </div>
  );
}
