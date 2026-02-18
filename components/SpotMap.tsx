"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type Props = {
  lat: number;
  lng: number;
  name: string;
};

export default function SpotMap({ lat, lng, name }: Props) {
  const [icon, setIcon] = useState<L.Icon | null>(null);

  useEffect(() => {
    setIcon(
      L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
    );
  }, []);

  if (!icon) return null;

  return (
    <div
      style={{
        height: 280,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={icon}>
          <Popup>{name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
