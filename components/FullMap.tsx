"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type SpotPin = {
  id: string;
  name: string;
  slug: string | null;
  lat: number;
  lng: number;
  categoria: string | null;
  fascia_prezzo: number | null;
  is_featured: boolean;
  city: string | null;
  avg_rating?: number | null;
};

function fixLeafletIcon() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

function featuredIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:linear-gradient(135deg,#6366f1,#ec4899);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 4px 14px rgba(99,102,241,0.45);
      border:2px solid white;
    ">🏅</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function prezzoStr(n: number | null): string {
  if (!n) return "";
  return "€".repeat(n);
}

function ratingStr(r: number | null | undefined): string {
  if (!r) return "—";
  return `⭐ ${Number(r).toFixed(1)}`;
}

export default function FullMap({ spots }: { spots: SpotPin[] }) {
  const [iconsReady, setIconsReady] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [cittaFilter, setCittaFilter] = useState("");

  useEffect(() => {
    fixLeafletIcon();
    setIconsReady(true);
  }, []);

  // Only spots with valid coordinates
  const withCoords = spots.filter((s) => s.lat != null && s.lng != null);

  // Unique categories and cities for filters
  const categorie = Array.from(new Set(withCoords.map((s) => s.categoria).filter(Boolean))) as string[];
  const citta = Array.from(new Set(withCoords.map((s) => s.city).filter(Boolean))) as string[];

  const filtered = withCoords.filter((s) => {
    if (categoriaFilter && s.categoria !== categoriaFilter) return false;
    if (cittaFilter && s.city !== cittaFilter) return false;
    return true;
  });

  // Default center: Italy
  const center: [number, number] =
    filtered.length > 0
      ? [filtered[0].lat, filtered[0].lng]
      : [42.5, 14.0];

  if (!iconsReady) return null;

  const selectStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.9)",
    fontSize: 13,
    outline: "none",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Filter controls */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <select
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tutte le categorie</option>
          {categorie.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        {citta.length > 1 && (
          <select
            value={cittaFilter}
            onChange={(e) => setCittaFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">Tutte le città</option>
            {citta.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <span
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(0,0,0,0.1)",
            fontSize: 12,
            fontWeight: 700,
            backdropFilter: "blur(6px)",
          }}
        >
          {filtered.length} spot
        </span>
      </div>

      <MapContainer
        center={center}
        zoom={filtered.length === 1 ? 15 : 10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filtered.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={s.is_featured ? featuredIcon() : undefined}
          >
            <Popup>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>
                  {s.is_featured ? "🏅 " : ""}{s.name}
                </div>
                {s.categoria && (
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
                    {s.categoria.charAt(0).toUpperCase() + s.categoria.slice(1)}
                    {s.fascia_prezzo ? ` · ${prezzoStr(s.fascia_prezzo)}` : ""}
                  </div>
                )}
                <div style={{ fontSize: 12, marginBottom: 6 }}>
                  {ratingStr(s.avg_rating)}
                </div>
                {s.slug && (
                  <a
                    href={`/v/${s.slug}`}
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
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
    </div>
  );
}
