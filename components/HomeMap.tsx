"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ✅ Fix icone Leaflet a livello modulo — sincrono, prima di qualsiasi render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type HomeSpotPin = {
  id: string;
  name: string;
  slug: string | null;
  lat: number;
  lng: number;
  categoria: string | null;
  fascia_prezzo: number | null;
  is_featured: boolean;
  avg_rating?: number | null;
};


function featuredIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:linear-gradient(135deg,#6366f1,#ec4899);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;box-shadow:0 4px 14px rgba(99,102,241,0.5);
      border:2px solid white;
    ">🏅</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
}

function prezzoStr(n: number | null): string {
  if (!n) return "";
  return "€".repeat(n);
}

/** Adatta il viewport per mostrare tutti i pin */
function FitBounds({ spots }: { spots: HomeSpotPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (spots.length === 0) return;
    if (spots.length === 1) {
      map.setView([spots[0].lat, spots[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, spots]);
  return null;
}

export default function HomeMap({ spots }: { spots: HomeSpotPin[] }) {
  // Guard: non renderizzare nulla finché non siamo lato client (post-mount)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const center: [number, number] =
    spots.length > 0 ? [spots[0].lat, spots[0].lng] : [42.5, 14.0];

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds spots={spots} />

      {spots.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={s.is_featured ? featuredIcon() : undefined}
        >
          <Popup>
            <div style={{ minWidth: 160, fontFamily: "system-ui, sans-serif" }}>
              {/* Nome */}
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>
                {s.is_featured ? "🏅 " : ""}
                {s.name}
              </div>

              {/* Categoria + prezzo */}
              {(s.categoria || s.fascia_prezzo) && (
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>
                  {s.categoria
                    ? s.categoria.charAt(0).toUpperCase() + s.categoria.slice(1)
                    : ""}
                  {s.fascia_prezzo ? ` · ${prezzoStr(s.fascia_prezzo)}` : ""}
                </div>
              )}

              {/* Rating */}
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {s.avg_rating
                  ? `⭐ ${Number(s.avg_rating).toFixed(1)}`
                  : "—"}
              </div>

              {/* Link */}
              {s.slug && (
                <a
                  href={`/v/${s.slug}`}
                  style={{
                    display: "inline-block",
                    padding: "5px 11px",
                    borderRadius: 8,
                    background: "rgba(99,102,241,0.12)",
                    border: "1px solid rgba(99,102,241,0.28)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6366f1",
                    textDecoration: "none",
                  }}
                >
                  Apri spot →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
